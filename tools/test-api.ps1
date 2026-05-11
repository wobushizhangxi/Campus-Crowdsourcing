$ErrorActionPreference = "Continue"
$BaseUrl = "http://localhost:8080"
$pass = 0
$fail = 0

Function api($m, $p, $b, $t) {
  $h = @{"Content-Type"="application/json"}
  if ($t) { $h["Authorization"]="Bearer $t" }
  try {
    $r = Invoke-RestMethod -Uri "$BaseUrl$p" -Method $m -Headers $h -Body $(if($b){ConvertTo-Json $b -Depth 10 -Compress}else{$null}) -TimeoutSec 30
    return @{ok=$true;r=$r}
  } catch {
    $sc=0; try{$sc=$_.Exception.Response.StatusCode.value__}catch{}
    return @{ok=$false;status=$sc}
  }
}

Function login($u,$p) {
  $res=api "POST" "/api/auth/login" @{username=$u;password=$p}
  if($res.ok -and $res.r.code -eq 200) {
    Write-Host "  [OK] Login $u" -F Green
    return $res.r.data.token
  }
  Write-Host "  [FAIL] Login $u" -F Red
  return $null
}

Function ok($m,$c) {
  if($c){Write-Host "  [PASS] $m" -F Green;$script:pass++}
  else{Write-Host "  [FAIL] $m" -F Red;$script:fail++}
}

Function title($t){Write-Host "";Write-Host "===== $t =====" -F Cyan}

# ================================================================
title "0. CLEANUP"
# ================================================================
$admT=login "admin001" "yukthSHroDjE08AvWF"
$ul=Invoke-RestMethod -Uri "$BaseUrl/api/admin/users" -Headers @{"Authorization"="Bearer $admT"} -TimeoutSec 10
foreach($u in $ul.data) {
  if($u.username -like "test*" -and $u.role -ne "ADMIN") {
    Invoke-RestMethod -Uri "$BaseUrl/api/admin/users/$($u.id)" -Method DELETE -Headers @{"Authorization"="Bearer $admT"} -TimeoutSec 10|Out-Null
    Write-Host "  Cleaned: $($u.username)"
  }
}

# ================================================================
title "1. AUTH"
# ================================================================
$admin=login "admin001" "yukthSHroDjE08AvWF"
ok "Admin login" ($admin -ne $null)

$aReg=api "POST" "/api/auth/register" @{username="testalice";password="Test1234!";name="AliceTester"}
ok "Register alice" ($aReg.r.code -eq 201)

$bReg=api "POST" "/api/auth/register" @{username="testbob";password="Test1234!";name="BobTester"}
ok "Register bob" ($bReg.r.code -eq 201)

$dup=api "POST" "/api/auth/register" @{username="testalice";password="x";name="x"}
ok "Reject duplicate" ($dup.r.code -ne 201)

$alice=login "testalice" "Test1234!"
$bob=login "testbob" "Test1234!"
ok "Alice logged in" ($alice -ne $null)
ok "Bob logged in" ($bob -ne $null)

# ================================================================
title "2. PROFILE & FUNDING"
# ================================================================
$ap=api "GET" "/api/users/profile" $null $alice
$aliceId=$ap.r.data.id
ok "Alice profile" ($ap.r.code -eq 200)
Write-Host ("    id="+$aliceId+" balance="+$ap.r.data.balance)

$bp=api "GET" "/api/users/profile" $null $bob
$bobId=$bp.r.data.id
ok "Bob profile" ($bp.r.code -eq 200)

$fund=api "POST" "/api/admin/users/$aliceId/balance-adjustments" @{amount=100.00;reason="Test funding"} $admin
ok "Fund alice +100" ($fund.r.code -eq 200)

# ================================================================
title "3. TASK: alice posts, bob accepts"
# ================================================================
$t1=api "POST" "/api/tasks" @{title="Return library books";description="Return 2 books to library.";reward=15.00;category="Errand";campus="Main Campus";location="Library"} $alice
$t1Id=$t1.r.data.task.id
ok "Post task1" ($t1.r.code -eq 201)
Write-Host ("    Task1 #"+$t1Id+" status="+$t1.r.data.task.status)

$t2=api "POST" "/api/tasks" @{title="Python coding help";description="Debug scraper ~1h.";reward=30.00;category="Study";campus="Main Campus";location="Bldg A"} $alice
$t2Id=$t2.r.data.task.id
ok "Post task2" ($t2.r.code -eq 201)

# GET /api/tasks = bare array
$all=Invoke-RestMethod -Uri "$BaseUrl/api/tasks" -Headers @{"Authorization"="Bearer $bob"} -TimeoutSec 10
$opencnt=@($all|Where-Object{$_.status -eq "open"}).Count
ok ("Open tasks: "+$opencnt) ($opencnt -ge 2)

$acc=api "POST" "/api/tasks/$t1Id/accept" $null $bob
ok "Bob accepts task1" ($acc.r.code -eq 200)
ok "Status=accepted" ($acc.r.data.task.status -eq "accepted")

$self=api "POST" "/api/tasks/$t1Id/accept" $null $alice
ok "Alice can't self-accept" ($self.r.code -ne 200)

# ================================================================
title "4. CHAT"
# ================================================================
$m1=api "POST" "/api/messages" @{taskId=$t1Id;text="I accepted your task. Will return books this afternoon."} $bob
ok "Bob sends msg" ($m1.r.code -eq 201)

$m2=api "POST" "/api/messages" @{taskId=$t1Id;text="OK, books are in my dorm. Let me know before you come."} $alice
ok "Alice replies" ($m2.r.code -eq 201)

$msgs=api "GET" "/api/messages/$t1Id" $null $bob
$msgArr=if($msgs.r.data -is [array]){$msgs.r.data}else{@($msgs.r.data)}
ok ("Chat: "+$msgArr.Count+" msgs") ($msgArr.Count -ge 2)

# ================================================================
title "5. TASK: bob submits, alice approves"
# ================================================================
$sub=api "POST" "/api/tasks/$t1Id/submit" @{note="Books returned. Receipt attached."} $bob
ok "Bob submits" ($sub.r.code -eq 200)
ok "Status=submitted" ($sub.r.data.task.status -eq "submitted")

# Alice approves (POST /approve, not /review)
$appr=api "POST" "/api/tasks/$t1Id/approve" $null $alice
ok "Alice approves" ($appr.r.code -eq 200)
ok "Status=completed" ($appr.r.data.task.status -eq "completed")

# Now alice writes a review
$rev=api "POST" "/api/tasks/$t1Id/reviews" @{rating=5;content="Very reliable and fast!"} $alice
ok "Alice writes 5-star review" ($rev.r.code -eq 201)
Write-Host ("    Review created")

# ================================================================
title "6. WALLET: bob got paid"
# ================================================================
$bNow=api "GET" "/api/users/profile" $null $bob
$bBal=[decimal]$bNow.r.data.balance
ok ("Bob balance "+$bBal+" > 0") ($bBal -gt 0)

# ================================================================
title "7. DISPUTE: create, accept, submit, dispute, resolve"
# ================================================================
$t3=api "POST" "/api/tasks" @{title="Photo editing";description="Edit ID photo, blue background.";reward=10.00;category="Other";campus="Main Campus";location="Online"} $alice
$t3Id=$t3.r.data.task.id
ok "Post task3" ($t3.r.code -eq 201)

api "POST" "/api/tasks/$t3Id/accept" $null $bob|Out-Null
api "POST" "/api/tasks/$t3Id/submit" @{note="Done, please check."} $bob|Out-Null

$disp=api "POST" "/api/tasks/$t3Id/dispute" @{reason="Background color wrong, not standard blue. Request refund."} $alice
ok "Alice disputes" ($disp.r.code -eq 200)
ok "Status=disputed" ($disp.r.data.task.status -eq "disputed")

$res=api "POST" "/api/admin/tasks/$t3Id/resolve" @{resolution="refund";note="Admin: quality does not meet requirements."} $admin
ok "Admin resolves (refund)" ($res.r.code -eq 200)
Write-Host ("    Resolution status="+$res.r.data.task.status)

# ================================================================
title "8. VERIFICATION"
# ================================================================
$v=api "POST" "/api/users/verification/me" @{campus="Main Campus";studentId="20240001";note="CS freshman"} $alice
ok "Alice submits verification" ($v.r.code -eq 200)
ok "Status=PENDING" ($v.r.data.verificationStatus -eq "PENDING")

$pend=api "GET" "/api/admin/verifications" $null $admin
ok ("Admin sees "+@($pend.r.data).Count+" pending") (@($pend.r.data).Count -ge 1)

$appV=api "POST" "/api/admin/verifications/$aliceId/approve" @{note="Verified."} $admin
ok "Admin approves verification" ($appV.r.code -eq 200)
ok "Status=VERIFIED" ($appV.r.data.verificationStatus -eq "VERIFIED")

# Reject flow: bob submits, admin rejects
$bV=api "POST" "/api/users/verification/me" @{campus="Main Campus";studentId="20240002";note="Engineering sophomore"} $bob
ok "Bob submits verification" ($bV.r.code -eq 200)

$rejV=api "POST" "/api/admin/verifications/$bobId/reject" @{note="Student ID does not match records."} $admin
ok "Admin rejects bob verification" ($rejV.r.code -eq 200)
ok "Status=REJECTED" ($rejV.r.data.verificationStatus -eq "REJECTED")

# ================================================================
title "9. REPORT: bob reports alice's task2"
# ================================================================
# Bob reports task2 (he is not the author)
$rep=api "POST" "/api/reports" @{taskId=$t2Id;reason="This task seems suspicious - possible academic dishonesty."} $bob
ok "Bob reports task2" ($rep.r.code -eq 201)

# Cannot report own task
$selfRep=api "POST" "/api/reports" @{taskId=$t2Id;reason="Bad"} $alice
ok "Alice cannot report own task" ($selfRep.r.code -ne 201)

# Cannot report same task twice
$dupRep=api "POST" "/api/reports" @{taskId=$t2Id;reason="Bad again"} $bob
ok "Cannot duplicate report" ($dupRep.r.code -ne 201)

# Admin lists reports
$reports=api "GET" "/api/admin/reports" $null $admin
ok ("Admin sees pending reports: "+@($reports.r.data).Count) (@($reports.r.data).Count -ge 1)

# Admin resolves report (remove task2)
$repId=$reports.r.data[0].id
$resRep=api "POST" "/api/admin/reports/$repId/resolve" @{action="remove";note="This task violates platform rules."} $admin
ok "Admin removes reported task" ($resRep.r.code -eq 200)

# Verify task2 is now removed (hidden from regular users)
$allAfterRemove=Invoke-RestMethod -Uri "$BaseUrl/api/tasks" -Headers @{"Authorization"="Bearer $bob"} -TimeoutSec 10
$removedStillVisible=(@($allAfterRemove|Where-Object{$_.id -eq $t2Id}).Count -gt 0)
ok "Removed task hidden from bob" (-not $removedStillVisible)

# But alice (author) can still see her own removed task
$aliceAll=Invoke-RestMethod -Uri "$BaseUrl/api/tasks" -Headers @{"Authorization"="Bearer $alice"} -TimeoutSec 10
$aliceSeesRemoved=(@($aliceAll|Where-Object{$_.id -eq $t2Id}).Count -gt 0)
ok "Author alice still sees removed task" $aliceSeesRemoved

# ================================================================
title "10. ADMIN: ban/unban"
# ================================================================
$ban=api "POST" "/api/admin/users/$bobId/ban" $null $admin
ok "Ban bob" ($ban.r.code -eq 200)
ok "Banned=true" ($ban.r.data.banned -eq $true)

$bp=api "POST" "/api/tasks" @{title="evil"} $bob
ok "Banned can't post" ($bp.r.code -ne 201)

$unb=api "POST" "/api/admin/users/$bobId/unban" $null $admin
ok "Unban bob" ($unb.r.code -eq 200)
ok "Banned=false" ($unb.r.data.banned -eq $false)

# ================================================================
title "11. ADMIN: balance adjustment"
# ================================================================
$adj=api "POST" "/api/admin/users/$bobId/balance-adjustments" @{amount=5.00;reason="Compensation"} $admin
ok "Adjust +5.00" ($adj.r.code -eq 200)
Write-Host ("    Balance="+$adj.r.data.balance)

# ================================================================
title "12. ADMIN: delete task"
# ================================================================
$dt=api "DELETE" "/api/admin/tasks/$t2Id" $null $admin
ok "Delete task2" ($dt.r.code -eq 200)

$all2=Invoke-RestMethod -Uri "$BaseUrl/api/tasks" -Headers @{"Authorization"="Bearer $admin"} -TimeoutSec 10
$gone=(@($all2|Where-Object{$_.id -eq $t2Id}).Count -eq 0)
ok "Task2 removed" $gone

# ================================================================
title "12. ADMIN: delete bob"
# ================================================================
$du=api "DELETE" "/api/admin/users/$bobId" $null $admin
ok "Delete bob" ($du.r.code -eq 200)

$br=api "POST" "/api/auth/login" @{username="testbob";password="Test1234!"}
ok "Deleted bob can't login" ($br.r.code -ne 200)

# ================================================================
title "13. GUARD CHECKS"
# ================================================================
$ac=api "GET" "/api/admin/users" $null $alice
ok "USER blocked from admin" ($ac.r.code -ne 200)

$admProf=api "GET" "/api/users/profile" $null $admin
$sd=api "DELETE" "/api/admin/users/$($admProf.r.data.id)" $null $admin
ok "Admin can't delete self" ($sd.r.code -ne 200)

# ================================================================
title "14. RESULTS"
# ================================================================
Write-Host ""
Write-Host ("="*40) -F Yellow
Write-Host ("  PASS: "+$pass+"  FAIL: "+$fail) -F Yellow
Write-Host ("="*40) -F Yellow
if($fail -eq 0){Write-Host "ALL TESTS PASSED!" -F Green}
else{Write-Host "SOME TESTS FAILED" -F Red}
