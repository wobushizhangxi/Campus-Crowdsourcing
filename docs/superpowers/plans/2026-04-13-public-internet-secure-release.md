# Public Internet Secure Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the campus crowd platform so untrusted public users can register and use it safely with JWT auth, role-based access, and an admin balance-management console.

**Architecture:** Keep the existing single Spring Boot application that serves the bundled React frontend, but move all identity decisions to the backend with Spring Security, BCrypt, JWT, and explicit `USER` / `ADMIN` roles. Keep MySQL on the local machine, expose only the application port through a tunnel, and add an in-app admin view instead of a public recharge flow.

**Tech Stack:** Spring Boot 4, Spring Security, Spring Data JPA, MySQL, H2 test database, React 19, Vite 8, Axios, Vitest, React Testing Library

---

## File Structure

### Backend files

- Modify: `campus-backend/pom.xml`
  Add Spring Security and JWT dependencies required for auth and authorization tests.
- Modify: `campus-backend/src/main/resources/application.properties`
  Add JWT/admin config placeholders, tighten public defaults, and remove permissive production CORS assumptions.
- Modify: `config/application-local.example.properties`
  Document local-only secrets for admin bootstrap and JWT signing.
- Modify: `campus-backend/src/test/resources/application.properties`
  Keep tests self-contained with H2 and deterministic security defaults.
- Create: `campus-backend/src/main/java/com/example/campusbackend/entity/UserRole.java`
  Enum for `USER` / `ADMIN`.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/User.java`
  Add role persistence while keeping the existing password column for BCrypt hashes.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
  Add queries used by admin list/search and current-user loading.
- Create: `campus-backend/src/main/java/com/example/campusbackend/config/SecurityProperties.java`
  Bind JWT and admin bootstrap properties.
- Create: `campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java`
  Stateless security chain, password encoder, route protection.
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/JwtTokenService.java`
  Generate and validate JWT tokens.
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/AppUserPrincipal.java`
  Adapt `User` to Spring Security.
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/AppUserDetailsService.java`
  Load users by username.
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/JwtAuthenticationFilter.java`
  Read bearer tokens and attach authenticated principals.
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/AdminAccountInitializer.java`
  Create or repair the configured admin user on startup.
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/LegacyPasswordMigrationService.java`
  Upgrade non-BCrypt passwords safely.
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/CurrentUserService.java`
  Central helper for current principal lookups and role checks.
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/TaskAuthorizationService.java`
  Shared participant / publisher / admin permission checks.
- Create: `campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java`
  Register, login, and `me` endpoints.
- Create: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
  User list/detail and balance-adjustment endpoints for admins only.
- Create: `campus-backend/src/main/java/com/example/campusbackend/dto/AuthResponse.java`
  Token + normalized current-user payload returned after login and `/me`.
- Create: `campus-backend/src/main/java/com/example/campusbackend/dto/BalanceAdjustmentRequest.java`
  Admin balance adjustment payload.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java`
  Remove trust in caller-supplied usernames, expose current-user-only profile/balance routes, and close public recharge.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
  Use authenticated user identity for create/accept/complete.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
  Restrict conversation access to task participants and admins.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/config/DemoDataInitializer.java`
  Seed BCrypt passwords and explicit roles.
- Modify: `campus-backend/src/main/java/com/example/campusbackend/config/DesktopBrowserLauncher.java`
  Leave browser-launch behavior configurable, but keep production defaults off.
- Create: `campus-backend/src/test/java/com/example/campusbackend/security/SecurityBootstrapTests.java`
  Cover startup admin bootstrap and anonymous route protection.
- Create: `campus-backend/src/test/java/com/example/campusbackend/auth/AuthControllerTests.java`
  Cover register, login, JWT `/me`, and legacy password upgrade.
- Create: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`
  Cover admin-only balance changes plus secured task/message flows.

### Frontend files

- Modify: `campus-frontend/package.json`
  Add `test` script and test dependencies.
- Create: `campus-frontend/vitest.config.js`
  Vitest config for `jsdom`.
- Create: `campus-frontend/src/test/setup.js`
  Testing Library / DOM matchers setup.
- Create: `campus-frontend/src/utils/sessionStorage.js`
  Read/write/clear JWT-backed session state.
- Modify: `campus-frontend/src/utils/accountStorage.js`
  Stop saving passwords and make remembered accounts username-only.
- Modify: `campus-frontend/src/utils/user.js`
  Track `role`, `token`-adjacent session data, and new auth-response mapping.
- Modify: `campus-frontend/src/services/api.js`
  Attach bearer tokens and centralize `401` handling.
- Modify: `campus-frontend/src/hooks/useAccountMemory.js`
  Remove password persistence and auto-login-by-password behavior.
- Modify: `campus-frontend/src/hooks/useWorkspaceData.js`
  Switch to `/api/auth/me` and `/api/users/balance/me`.
- Modify: `campus-frontend/src/App.jsx`
  Load session from token, use new auth endpoints, hide removed recharge flow, wire admin view.
- Modify: `campus-frontend/src/components/AuthScreen.jsx`
  Remove password-memory UX assumptions from login helpers.
- Modify: `campus-frontend/src/components/layout/BottomNav.jsx`
  Add conditional admin tab.
- Create: `campus-frontend/src/components/pages/AdminView.jsx`
  Search users, inspect a user, submit balance adjustments.
- Modify: `campus-frontend/src/components/pages/WalletView.jsx`
  Remove recharge form and keep read-only balance history.
- Create: `campus-frontend/src/utils/__tests__/sessionStorage.test.js`
  Validate token/session persistence.
- Create: `campus-frontend/src/utils/__tests__/accountStorage.test.js`
  Validate remembered accounts never keep passwords.
- Create: `campus-frontend/src/services/__tests__/api.test.js`
  Validate auth header injection and session clearing on `401`.
- Create: `campus-frontend/src/hooks/__tests__/useWorkspaceData.test.jsx`
  Validate current-user and wallet endpoints.
- Create: `campus-frontend/src/components/pages/__tests__/AdminView.test.jsx`
  Validate admin search and balance adjustment submission.
- Create: `campus-frontend/src/components/pages/__tests__/WalletView.test.jsx`
  Validate recharge UI is gone.

## Task 1: Add Backend Security Foundation

**Files:**
- Modify: `campus-backend/pom.xml`
- Modify: `campus-backend/src/main/resources/application.properties`
- Modify: `config/application-local.example.properties`
- Modify: `campus-backend/src/test/resources/application.properties`
- Create: `campus-backend/src/main/java/com/example/campusbackend/entity/UserRole.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/entity/User.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/config/SecurityProperties.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/AdminAccountInitializer.java`
- Create: `campus-backend/src/test/java/com/example/campusbackend/security/SecurityBootstrapTests.java`

- [ ] **Step 1: Write the failing security bootstrap test**

```java
package com.example.campusbackend.security;

import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.jwt.secret=test-secret-key-with-at-least-32-bytes",
        "app.security.admin.username=admin001",
        "app.security.admin.password=Admin123!",
        "app.security.admin.name=Platform Admin",
        "app.open-browser=false",
        "app.seed-demo-data=false"
})
class SecurityBootstrapTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void anonymousUserCannotLoadTasks() throws Exception {
        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void startupCreatesAdminAccountWithAdminRoleAndHashedPassword() {
        User admin = userRepository.findByUsername("admin001").orElseThrow();

        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(admin.getPassword()).startsWith("$2");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd -Dtest=SecurityBootstrapTests test`

Expected: FAIL because `/api/tasks` still returns `200` and the `User` entity has no `role` or startup admin bootstrap yet.

- [ ] **Step 3: Write minimal security infrastructure**

```xml
<!-- campus-backend/pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.7</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.7</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.7</version>
    <scope>runtime</scope>
</dependency>
```

```java
// campus-backend/src/main/java/com/example/campusbackend/entity/UserRole.java
package com.example.campusbackend.entity;

public enum UserRole {
    USER,
    ADMIN
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/entity/User.java
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 20)
private UserRole role = UserRole.USER;

public UserRole getRole() {
    return role;
}

public void setRole(UserRole role) {
    this.role = role == null ? UserRole.USER : role;
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/config/SecurityProperties.java
@ConfigurationProperties(prefix = "app.security")
public class SecurityProperties {
    private final Jwt jwt = new Jwt();
    private final Admin admin = new Admin();
    public Jwt getJwt() {
        return jwt;
    }

    public Admin getAdmin() {
        return admin;
    }

    public static class Jwt {
        private String secret;
        private long expirationMinutes = 720;

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public long getExpirationMinutes() {
            return expirationMinutes;
        }

        public void setExpirationMinutes(long expirationMinutes) {
            this.expirationMinutes = expirationMinutes;
        }
    }

    public static class Admin {
        private String username;
        private String password;
        private String name = "Platform Admin";

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java
@Configuration
@EnableConfigurationProperties(SecurityProperties.class)
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().authenticated()
                )
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/service/AdminAccountInitializer.java
@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityProperties securityProperties;

    public void run(String... args) {
        String username = securityProperties.getAdmin().getUsername();
        String password = securityProperties.getAdmin().getPassword();
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return;
        }

        User admin = userRepository.findByUsername(username).orElseGet(User::new);
        admin.setUsername(username.trim());
        admin.setPassword(passwordEncoder.encode(password));
        admin.setName(securityProperties.getAdmin().getName());
        admin.setRole(UserRole.ADMIN);
        userRepository.save(admin);
    }
}
```

```properties
# campus-backend/src/main/resources/application.properties
app.security.jwt.secret=${APP_SECURITY_JWT_SECRET:change-me-before-public-launch}
app.security.jwt.expiration-minutes=${APP_SECURITY_JWT_EXPIRATION_MINUTES:720}
app.security.admin.username=${APP_SECURITY_ADMIN_USERNAME:}
app.security.admin.password=${APP_SECURITY_ADMIN_PASSWORD:}
app.security.admin.name=${APP_SECURITY_ADMIN_NAME:Platform Admin}
app.open-browser=${APP_OPEN_BROWSER:false}
app.seed-demo-data=${APP_SEED_DEMO_DATA:false}
```

```properties
# config/application-local.example.properties
app.security.jwt.secret=replace-with-a-long-random-secret
app.security.jwt.expiration-minutes=720
app.security.admin.username=admin001
app.security.admin.password=change-this-admin-password
app.security.admin.name=Platform Admin
app.open-browser=false
app.seed-demo-data=false
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd -Dtest=SecurityBootstrapTests test`

Expected: PASS with `/api/tasks` returning `401` and the configured admin user stored as `ADMIN` with a BCrypt hash.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/pom.xml campus-backend/src/main/resources/application.properties config/application-local.example.properties campus-backend/src/test/resources/application.properties campus-backend/src/main/java/com/example/campusbackend/entity/UserRole.java campus-backend/src/main/java/com/example/campusbackend/entity/User.java campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java campus-backend/src/main/java/com/example/campusbackend/config/SecurityProperties.java campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java campus-backend/src/main/java/com/example/campusbackend/service/AdminAccountInitializer.java campus-backend/src/test/java/com/example/campusbackend/security/SecurityBootstrapTests.java
git commit -m "feat: add backend security bootstrap"
```

### Task 2: Implement JWT Auth and Legacy Password Upgrade

**Files:**
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/JwtTokenService.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/AppUserPrincipal.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/AppUserDetailsService.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/security/JwtAuthenticationFilter.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/LegacyPasswordMigrationService.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/dto/AuthResponse.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/dto/AuthRequest.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/config/DemoDataInitializer.java`
- Create: `campus-backend/src/test/java/com/example/campusbackend/auth/AuthControllerTests.java`

- [ ] **Step 1: Write the failing auth controller tests**

```java
package com.example.campusbackend.auth;

import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.jwt.secret=test-secret-key-with-at-least-32-bytes",
        "app.open-browser=false",
        "app.seed-demo-data=false"
})
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanUp() {
        userRepository.deleteAll();
    }

    @Test
    void registerStoresHashedPasswordAndDefaultUserRole() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "20249999",
                                  "password": "Secret123!",
                                  "name": "New User",
                                  "email": "new@example.com"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.username").value("20249999"))
                .andExpect(jsonPath("$.data.user.role").value("USER"))
                .andExpect(jsonPath("$.data.token").isString());

        User savedUser = userRepository.findByUsername("20249999").orElseThrow();
        assertThat(savedUser.getRole()).isEqualTo(UserRole.USER);
        assertThat(savedUser.getPassword()).startsWith("$2");
    }

    @Test
    void loginReturnsJwtAndUpgradesLegacyPlaintextPassword() throws Exception {
        User legacyUser = new User();
        legacyUser.setUsername("legacy001");
        legacyUser.setPassword("123456");
        legacyUser.setName("Legacy User");
        legacyUser.setRole(UserRole.USER);
        userRepository.save(legacyUser);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "legacy001",
                                  "password": "123456"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.user.username").value("legacy001"));

        User updatedUser = userRepository.findByUsername("legacy001").orElseThrow();
        assertThat(updatedUser.getPassword()).startsWith("$2");
    }

    @Test
    void meReturnsCurrentUserForBearerToken() throws Exception {
        String response = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "viewer001",
                                  "password": "Secret123!",
                                  "name": "Viewer",
                                  "email": "viewer@example.com"
                                }
                                """))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String jwt = JsonPath.read(response, "$.data.token");

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + jwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.username").value("viewer001"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd -Dtest=AuthControllerTests test`

Expected: FAIL because `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` do not exist yet and plaintext passwords are not upgraded.

- [ ] **Step 3: Write minimal auth implementation**

```java
// campus-backend/src/main/java/com/example/campusbackend/security/JwtTokenService.java
@Service
public class JwtTokenService {

    private final SecretKey secretKey;
    private final long expirationMinutes;

    public JwtTokenService(SecurityProperties properties) {
        this.secretKey = Keys.hmacShaKeyFor(properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = properties.getJwt().getExpirationMinutes();
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(secretKey)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/security/AppUserPrincipal.java
public record AppUserPrincipal(User user) implements UserDetails {
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/security/AppUserDetailsService.java
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
                .map(AppUserPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException(username));
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/service/LegacyPasswordMigrationService.java
@Service
public class LegacyPasswordMigrationService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public boolean isHashed(String passwordValue) {
        return passwordValue != null && passwordValue.startsWith("$2");
    }

    public boolean matchesAndUpgrade(User user, String rawPassword) {
        if (user == null || rawPassword == null) {
            return false;
        }
        if (isHashed(user.getPassword())) {
            return passwordEncoder.matches(rawPassword, user.getPassword());
        }
        if (!rawPassword.equals(user.getPassword())) {
            return false;
        }
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
        return true;
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody AuthRequest request) {
        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        user.setName(defaultIfBlank(request.getName(), request.getUsername().trim()));
        user.setEmail(normalizeOptional(request.getEmail()));
        user.setRole(UserRole.USER);
        User savedUser = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "code", 201,
                "message", "register success",
                "data", buildAuthResponse(savedUser)
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody AuthRequest request) {
        User user = userRepository.findByUsername(request.getUsername().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not registered"));
        if (!legacyPasswordMigrationService.matchesAndUpgrade(user, request.getPassword().trim())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "password incorrect");
        }
        User refreshedUser = userRepository.findById(user.getId()).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "code", 200,
                "message", "login success",
                "data", buildAuthResponse(refreshedUser)
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return ResponseEntity.ok(Map.of(
                "code", 200,
                "message", "success",
                "data", buildAuthResponse(principal.user())
        ));
    }

    private AuthResponse buildAuthResponse(User user) {
        return new AuthResponse(
                jwtTokenService.generateToken(user),
                Map.of(
                        "id", user.getId(),
                        "username", user.getUsername(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole().name(),
                        "balance", user.getBalance()
                )
        );
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/dto/AuthResponse.java
public record AuthResponse(
        String token,
        Map<String, Object> user
) {
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/security/JwtAuthenticationFilter.java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            String username = jwtTokenService.extractUsername(token);
            UserDetails userDetails = appUserDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        filterChain.doFilter(request, response);
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java
http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
```

```java
// campus-backend/src/main/java/com/example/campusbackend/config/DemoDataInitializer.java
publisher.setPassword(passwordEncoder.encode(password));
publisher.setRole(UserRole.USER);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd -Dtest=AuthControllerTests test`

Expected: PASS with successful register/login flows, a bearer token returned from login/register, and legacy plaintext passwords upgraded to BCrypt.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/security/JwtTokenService.java campus-backend/src/main/java/com/example/campusbackend/security/AppUserPrincipal.java campus-backend/src/main/java/com/example/campusbackend/security/AppUserDetailsService.java campus-backend/src/main/java/com/example/campusbackend/security/JwtAuthenticationFilter.java campus-backend/src/main/java/com/example/campusbackend/service/LegacyPasswordMigrationService.java campus-backend/src/main/java/com/example/campusbackend/controller/AuthController.java campus-backend/src/main/java/com/example/campusbackend/dto/AuthResponse.java campus-backend/src/main/java/com/example/campusbackend/dto/AuthRequest.java campus-backend/src/main/java/com/example/campusbackend/config/SecurityConfig.java campus-backend/src/main/java/com/example/campusbackend/config/DemoDataInitializer.java campus-backend/src/test/java/com/example/campusbackend/auth/AuthControllerTests.java
git commit -m "feat: add jwt auth endpoints"
```

### Task 3: Secure Business Endpoints and Add Admin Balance Management

**Files:**
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/CurrentUserService.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/service/TaskAuthorizationService.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java`
- Create: `campus-backend/src/main/java/com/example/campusbackend/dto/BalanceAdjustmentRequest.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java`
- Modify: `campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java`
- Create: `campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java`

- [ ] **Step 1: Write the failing secured business flow tests**

```java
package com.example.campusbackend.security;

import com.example.campusbackend.entity.Task;
import com.example.campusbackend.entity.User;
import com.example.campusbackend.entity.UserRole;
import com.example.campusbackend.repository.TaskRepository;
import com.example.campusbackend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.jwt.secret=test-secret-key-with-at-least-32-bytes",
        "app.open-browser=false",
        "app.seed-demo-data=false"
})
class SecuredBusinessFlowTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenService jwtTokenService;

    @BeforeEach
    void cleanUp() {
        taskRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void createTaskUsesAuthenticatedPublisherInsteadOfPayloadUsername() throws Exception {
        String publisherToken = registerAndLogin("publisher001", "Publisher", UserRole.USER);

        mockMvc.perform(post("/api/tasks")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Pick up lunch",
                                  "description": "Take lunch to dormitory.",
                                  "reward": 4.50,
                                  "authorUsername": "forged-user",
                                  "author": "Forged Name"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.task.authorUsername").value("publisher001"));

        Task savedTask = taskRepository.findAll().get(0);
        assertThat(savedTask.getAuthorUsername()).isEqualTo("publisher001");
    }

    @Test
    void normalUserCannotAdjustBalanceButAdminCan() throws Exception {
        String userToken = registerAndLogin("runner001", "Runner", UserRole.USER);
        String adminToken = registerAndLogin("admin001", "Admin", UserRole.ADMIN);
        User runner = userRepository.findByUsername("runner001").orElseThrow();

        mockMvc.perform(post("/api/admin/users/{id}/balance-adjustments", runner.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": "10.00",
                                  "reason": "manual top-up"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/users/{id}/balance-adjustments", runner.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "amount": "10.00",
                                  "reason": "manual top-up"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balance").value(10.00));
    }

    @Test
    void nonParticipantCannotReadTaskMessages() throws Exception {
        String publisherToken = registerAndLogin("publisher002", "Publisher 2", UserRole.USER);
        String strangerToken = registerAndLogin("stranger001", "Stranger", UserRole.USER);
        Task task = createAcceptedTask("publisher002", "publisher002");

        mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + strangerToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/messages/{taskId}", task.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + publisherToken))
                .andExpect(status().isOk());
    }

    private String registerAndLogin(String username, String name, UserRole role) {
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode("Secret123!"));
        user.setName(name);
        user.setRole(role);
        user.setBalance(new BigDecimal("20.00"));
        User savedUser = userRepository.save(user);
        return jwtTokenService.generateToken(savedUser);
    }

    private Task createAcceptedTask(String authorUsername, String assigneeUsername) {
        Task task = new Task();
        task.setTitle("Deliver Documents");
        task.setDescription("Deliver the documents to the library.");
        task.setReward(new BigDecimal("8.80"));
        task.setStatus("accepted");
        task.setAuthorUsername(authorUsername);
        task.setAuthor(authorUsername);
        task.setAssignee(assigneeUsername);
        return taskRepository.save(task);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\mvnw.cmd -Dtest=SecuredBusinessFlowTests test`

Expected: FAIL because task creation still trusts `authorUsername`, admin endpoints do not exist, and message reads are still open to any authenticated caller.

- [ ] **Step 3: Write minimal secured business implementation**

```java
// campus-backend/src/main/java/com/example/campusbackend/service/CurrentUserService.java
@Service
public class CurrentUserService {

    public User requireCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "authentication required");
        }
        return principal.user();
    }

    public boolean isAdmin(User user) {
        return user != null && user.getRole() == UserRole.ADMIN;
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/service/TaskAuthorizationService.java
@Service
public class TaskAuthorizationService {

    public boolean canAccessTaskConversation(User actor, Task task) {
        return actor.getRole() == UserRole.ADMIN
                || actor.getUsername().equals(task.getAuthorUsername())
                || actor.getUsername().equals(task.getAssignee());
    }

    public boolean canCompleteTask(User actor, Task task) {
        return actor.getRole() == UserRole.ADMIN
                || actor.getUsername().equals(task.getAuthorUsername());
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java
@PostMapping
@Transactional
public ResponseEntity<Map<String, Object>> createTask(@RequestBody Task task, Authentication authentication) {
    User publisher = currentUserService.requireCurrentUser(authentication);
    BigDecimal reward = normalizeMoney(task.getReward());
    BigDecimal currentBalance = normalizeMoney(publisher.getBalance());
    if (reward.compareTo(BigDecimal.ZERO) <= 0) {
        return buildResponse(HttpStatus.BAD_REQUEST, "reward must be greater than 0", null);
    }
    if (currentBalance.compareTo(reward) < 0) {
        return buildResponse(HttpStatus.CONFLICT, "insufficient balance", null);
    }
    BigDecimal nextBalance = currentBalance.subtract(reward);
    publisher.setBalance(nextBalance);
    userRepository.save(publisher);
    task.setAuthorUsername(publisher.getUsername());
    task.setAuthor(normalizeValue(publisher.getName()) == null ? publisher.getUsername() : publisher.getName());
    task.setStatus("open");
    task.setAssignee(null);
    task.setCompletedAt(null);
    Task savedTask = taskRepository.save(task);
    saveBalanceRecord(publisher.getUsername(), reward.negate(), nextBalance, "task_publish", "Task publish", savedTask.getTitle(), savedTask.getId());
    Map<String, Object> data = new LinkedHashMap<>();
    data.put("task", savedTask);
    data.put("balance", nextBalance);
    return buildResponse(HttpStatus.CREATED, "task created", data);
}

@PostMapping("/{id}/accept")
public ResponseEntity<Map<String, Object>> acceptTask(@PathVariable Long id, Authentication authentication) {
    User actor = currentUserService.requireCurrentUser(authentication);
    Task task = taskRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    task.setAssignee(actor.getUsername());
    task.setStatus("accepted");
    return buildResponse(HttpStatus.OK, "task accepted", Map.of("task", taskRepository.save(task)));
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java
@GetMapping("/profile")
public ResponseEntity<Map<String, Object>> getCurrentProfile(Authentication authentication) {
    User currentUser = currentUserService.requireCurrentUser(authentication);
    return buildResponse(HttpStatus.OK, "success", buildUserData(userRepository.findById(currentUser.getId()).orElseThrow()));
}

@GetMapping("/balance/me")
public ResponseEntity<Map<String, Object>> getCurrentBalance(Authentication authentication) {
    User currentUser = currentUserService.requireCurrentUser(authentication);
    Map<String, Object> data = buildUserData(currentUser);
    data.put("records", buildBalanceRecordsData(balanceRecordRepository.findTop50ByUsernameOrderByCreatedAtDesc(currentUser.getUsername())));
    return buildResponse(HttpStatus.OK, "success", data);
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(@RequestParam(defaultValue = "") String keyword) {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .filter(user -> keyword.isBlank() || user.getUsername().contains(keyword) || (user.getName() != null && user.getName().contains(keyword)))
                .map(this::toUserSummary)
                .toList();
        return ResponseEntity.ok(Map.of("code", 200, "message", "success", "data", users));
    }

    @PostMapping("/users/{id}/balance-adjustments")
    public ResponseEntity<Map<String, Object>> adjustBalance(@PathVariable Long id, @RequestBody BalanceAdjustmentRequest request) {
        User target = userRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        BigDecimal amount = new BigDecimal(request.getAmount());
        BigDecimal nextBalance = normalizeMoney(target.getBalance()).add(amount);
        if (nextBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "balance cannot be negative");
        }
        target.setBalance(nextBalance);
        userRepository.save(target);
        saveBalanceRecord(target.getUsername(), amount, nextBalance, "admin_adjustment", "管理员余额调整", request.getReason(), null);
        return ResponseEntity.ok(Map.of("code", 200, "message", "balance adjusted", "data", toUserDetail(target)));
    }
}
```

```java
// campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java
@GetMapping("/{taskId}")
public ResponseEntity<Map<String, Object>> getMessages(@PathVariable Long taskId, Authentication authentication) {
    User actor = currentUserService.requireCurrentUser(authentication);
    Task task = taskRepository.findById(taskId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    if (!taskAuthorizationService.canAccessTaskConversation(actor, task)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");
    }
    List<Message> messages = messageRepository.findByTaskIdOrderByIdAsc(taskId);
    return ResponseEntity.ok(Map.of("code", 200, "message", "success", "data", messages));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.\mvnw.cmd -Dtest=SecuredBusinessFlowTests test`

Expected: PASS with forged task authors ignored, non-admin balance changes rejected, admin balance changes accepted, and unauthorized message readers blocked.

- [ ] **Step 5: Commit**

```bash
git add campus-backend/src/main/java/com/example/campusbackend/service/CurrentUserService.java campus-backend/src/main/java/com/example/campusbackend/service/TaskAuthorizationService.java campus-backend/src/main/java/com/example/campusbackend/controller/AdminController.java campus-backend/src/main/java/com/example/campusbackend/dto/BalanceAdjustmentRequest.java campus-backend/src/main/java/com/example/campusbackend/controller/UserController.java campus-backend/src/main/java/com/example/campusbackend/controller/TaskController.java campus-backend/src/main/java/com/example/campusbackend/controller/MessageController.java campus-backend/src/main/java/com/example/campusbackend/repository/UserRepository.java campus-backend/src/test/java/com/example/campusbackend/security/SecuredBusinessFlowTests.java
git commit -m "feat: secure business flows and admin balance management"
```

### Task 4: Add Frontend Test Harness and Session Utilities

**Files:**
- Modify: `campus-frontend/package.json`
- Create: `campus-frontend/vitest.config.js`
- Create: `campus-frontend/src/test/setup.js`
- Create: `campus-frontend/src/utils/sessionStorage.js`
- Modify: `campus-frontend/src/utils/accountStorage.js`
- Modify: `campus-frontend/src/services/api.js`
- Create: `campus-frontend/src/utils/__tests__/sessionStorage.test.js`
- Create: `campus-frontend/src/utils/__tests__/accountStorage.test.js`
- Create: `campus-frontend/src/services/__tests__/api.test.js`

- [ ] **Step 1: Write the failing frontend utility tests and test harness**

```json
// campus-frontend/package.json
{
  "scripts": {
    "test": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.2.4",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.9.1",
    "jsdom": "^26.1.0"
  }
}
```

```js
// campus-frontend/src/utils/__tests__/sessionStorage.test.js
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, readSession, writeSession } from '../sessionStorage';

describe('sessionStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists token and current user summary', () => {
    writeSession({ token: 'jwt-token', user: { username: 'admin001', role: 'ADMIN' } });
    expect(readSession()).toEqual({
      token: 'jwt-token',
      user: { username: 'admin001', role: 'ADMIN' },
    });
  });

  it('clears the full auth session', () => {
    writeSession({ token: 'jwt-token', user: { username: 'viewer001', role: 'USER' } });
    clearSession();
    expect(readSession()).toBeNull();
  });
});
```

```js
// campus-frontend/src/utils/__tests__/accountStorage.test.js
import { describe, expect, it } from 'vitest';
import { rememberLoginAccount } from '../accountStorage';

describe('rememberLoginAccount', () => {
  it('never persists the raw password for remembered accounts', () => {
    const nextAccounts = rememberLoginAccount([], {
      username: '20240001',
      name: 'Runner',
      password: 'Secret123!',
      autoLogin: true,
    });

    expect(nextAccounts[0]).toMatchObject({
      username: '20240001',
      name: 'Runner',
      autoLogin: false,
      password: '',
    });
  });
});
```

```js
// campus-frontend/src/services/__tests__/api.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { clearSession, writeSession } from '../../utils/sessionStorage';
import { apiGet } from '../api';

vi.mock('axios');

describe('api auth handling', () => {
  beforeEach(() => {
    clearSession();
    axios.mockReset();
  });

  it('attaches bearer token when present', async () => {
    writeSession({ token: 'jwt-token', user: { username: 'admin001', role: 'ADMIN' } });
    axios.mockResolvedValueOnce({ data: { code: 200, data: [] } });

    await apiGet('/api/tasks');

    expect(axios).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer jwt-token',
      }),
    }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd install`

Run: `npm.cmd test -- --run src/utils/__tests__/sessionStorage.test.js src/utils/__tests__/accountStorage.test.js src/services/__tests__/api.test.js`

Expected: FAIL because the session utility does not exist, remembered accounts still store passwords, and API requests do not inject `Authorization`.

- [ ] **Step 3: Write minimal frontend session implementation**

```js
// campus-frontend/src/utils/sessionStorage.js
const SESSION_KEY = 'campus.session';

export const readSession = () => {
  try {
    const rawValue = window.localStorage.getItem(SESSION_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
};

export const writeSession = (session) => {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  window.localStorage.removeItem(SESSION_KEY);
};
```

```js
// campus-frontend/src/utils/accountStorage.js
const nextAccount = {
  username: normalizedUsername,
  name: account.name?.trim() || normalizedUsername,
  password: '',
  autoLogin: false,
  lastUsedAt: account.lastUsedAt || new Date().toISOString(),
};
```

```js
// campus-frontend/src/services/api.js
import { clearSession, readSession } from '../utils/sessionStorage';

const buildHeaders = (headers = {}) => {
  const session = readSession();
  if (!session?.token) {
    return headers;
  }
  return {
    ...headers,
    Authorization: `Bearer ${session.token}`,
  };
};

return await axios({
  method,
  url: `${baseUrl}${path}`,
  data,
  headers: buildHeaders(config.headers),
  ...config,
});
```

```js
// campus-frontend/src/services/api.js
if (error.response?.status === 401) {
  clearSession();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- --run src/utils/__tests__/sessionStorage.test.js src/utils/__tests__/accountStorage.test.js src/services/__tests__/api.test.js`

Expected: PASS with token persistence, username-only remembered accounts, and bearer headers applied to API requests.

- [ ] **Step 5: Commit**

```bash
git add campus-frontend/package.json campus-frontend/vitest.config.js campus-frontend/src/test/setup.js campus-frontend/src/utils/sessionStorage.js campus-frontend/src/utils/accountStorage.js campus-frontend/src/services/api.js campus-frontend/src/utils/__tests__/sessionStorage.test.js campus-frontend/src/utils/__tests__/accountStorage.test.js campus-frontend/src/services/__tests__/api.test.js
git commit -m "test: add frontend auth session coverage"
```

### Task 5: Migrate Frontend User Flows to Token Auth and Read-Only Wallet

**Files:**
- Modify: `campus-frontend/src/utils/user.js`
- Modify: `campus-frontend/src/hooks/useAccountMemory.js`
- Modify: `campus-frontend/src/hooks/useWorkspaceData.js`
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/AuthScreen.jsx`
- Modify: `campus-frontend/src/components/pages/WalletView.jsx`
- Create: `campus-frontend/src/hooks/__tests__/useWorkspaceData.test.jsx`
- Create: `campus-frontend/src/components/pages/__tests__/WalletView.test.jsx`

- [ ] **Step 1: Write the failing auth-flow and wallet tests**

```jsx
// campus-frontend/src/hooks/__tests__/useWorkspaceData.test.jsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useWorkspaceData from '../useWorkspaceData';
import * as api from '../../services/api';

vi.mock('../../services/api');

describe('useWorkspaceData', () => {
  it('loads the current user from /api/auth/me and wallet data from /api/users/balance/me', async () => {
    api.apiGet
      .mockResolvedValueOnce({ data: { code: 200, data: { user: { username: 'viewer001', role: 'USER', balance: 12.5 } } } })
      .mockResolvedValueOnce({ data: { code: 200, data: { balance: 12.5, records: [] } } });

    const setCurrentUser = vi.fn();

    const { result } = renderHook(() => useWorkspaceData({
      currentUser: { studentId: 'viewer001' },
      isAuthenticated: true,
      profileSection: 'wallet',
      setCurrentUser,
    }));

    await waitFor(() => {
      expect(api.apiGet).toHaveBeenCalledWith('/api/auth/me');
      expect(api.apiGet).toHaveBeenCalledWith('/api/users/balance/me');
    });

    expect(result.current.walletRecords).toEqual([]);
  });
});
```

```jsx
// campus-frontend/src/components/pages/__tests__/WalletView.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WalletView from '../WalletView';

describe('WalletView', () => {
  it('renders balance history without a recharge form', () => {
    render(
      <WalletView
        closeWalletView={() => {}}
        currentUser={{ balance: 20 }}
        formatDateTime={(value) => value}
        formatRmb={(value) => `CNY ${value}`}
        formatSignedRmb={(value) => value}
        getBalanceRecordMeta={() => ({ badge: 'income', tone: 'positive' })}
        handleManualRefresh={() => {}}
        isRefreshingProfile={false}
        isWalletLoading={false}
        lastSyncAt={null}
        walletError=""
        walletRecords={[]}
      />
    );

    expect(screen.queryByTestId('wallet-recharge-form')).toBeNull();
    expect(screen.getByTestId('wallet-balance-summary')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --run src/hooks/__tests__/useWorkspaceData.test.jsx src/components/pages/__tests__/WalletView.test.jsx`

Expected: FAIL because the hook still uses username-based endpoints and `WalletView` still renders the recharge form.

- [ ] **Step 3: Write minimal token-based frontend flow**

```js
// campus-frontend/src/utils/user.js
export const emptyUser = {
  id: null,
  role: 'USER',
  name: '',
  balance: 0,
  completedCount: 0,
  studentId: '',
  email: '',
  phone: '',
  campus: '主校区',
  address: '',
  bio: '',
};

export const mapAuthUserToCurrentUser = (userData, fallbackUser = emptyUser) => ({
  ...mapUserDataToCurrentUser(userData, fallbackUser),
  role: userData?.role || fallbackUser.role || 'USER',
});
```

```js
// campus-frontend/src/hooks/useWorkspaceData.js
const refreshCurrentUserSummary = async () => {
  try {
    const response = await apiGet('/api/auth/me');
    if (response.data.code === 200 && response.data.data?.user) {
      setCurrentUser((prev) => mapAuthUserToCurrentUser(response.data.data.user, prev));
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

const refreshWalletData = async ({ silent = false } = {}) => {
  const response = await apiGet('/api/users/balance/me');
  if (response.data.code === 200 && response.data.data) {
    const userData = response.data.data;
    setCurrentUser((prev) => mapAuthUserToCurrentUser(userData, prev));
    setWalletRecords(Array.isArray(userData.records) ? userData.records : []);
    if (!silent) {
      setLastSyncAt(new Date());
    }
    return true;
  }
  return false;
};
```

```js
// campus-frontend/src/hooks/useAccountMemory.js
const [rememberAccount, setRememberAccount] = useState(() => Boolean(getLastSavedAccount(readSavedAccounts())?.username));
const [autoLoginEnabled, setAutoLoginEnabled] = useState(() => false);

const hydrateLoginFormFromAccount = useCallback((account = lastSavedAccount) => {
  setAuthForms({
    login: {
      studentId: account?.username || '',
      password: '',
    },
    register: emptyAuthForms.register,
  });
}, [lastSavedAccount, setAuthForms]);
```

```jsx
// campus-frontend/src/App.jsx
const completeLogin = (authData, username, options = {}) => {
  writeSession({
    token: authData.token,
    user: authData.user,
  });
  persistLoginAccount({
    username,
    name: authData.user.name || username.trim(),
    remember: options.rememberAccount,
  });
  setCurrentUser(mapAuthUserToCurrentUser(authData.user, emptyUser));
  setIsAuthenticated(true);
};

const loginWithCredentials = async (username, password, options = {}) => {
  const response = await apiPost('/api/auth/login', { username, password });
  completeLogin(response.data.data, username, options);
};
```

```jsx
// campus-frontend/src/components/pages/WalletView.jsx
export default function WalletView({
  closeWalletView,
  currentUser,
  formatDateTime,
  formatRmb,
  formatSignedRmb,
  getBalanceRecordMeta,
  handleManualRefresh,
  isRefreshingProfile,
  isWalletLoading,
  lastSyncAt,
  walletError,
  walletRecords,
}) {
  return (
    <section className="space-y-4">
      <div data-testid="wallet-balance-summary" className="rounded-3xl bg-slate-900 p-5 text-white">
        <p className="text-sm text-slate-300">Balance</p>
        <p className="mt-2 text-3xl font-black">{formatRmb(currentUser.balance.toFixed(2))}</p>
      </div>
      <button type="button" onClick={handleManualRefresh} disabled={isRefreshingProfile || isWalletLoading}>
        Refresh
      </button>
      {walletError ? <div>{walletError}</div> : null}
      <div className="space-y-3">
        {walletRecords.map((record) => {
          const meta = getBalanceRecordMeta(record.type);
          return (
            <article key={record.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold">{record.title}</p>
              <p className="text-sm text-slate-500">{formatDateTime(record.createdAt)}</p>
              <p className="text-sm">{formatSignedRmb(record.amount)}</p>
              <span>{meta.badge}</span>
            </article>
          );
        })}
      </div>
      <button type="button" onClick={closeWalletView}>Back</button>
      {lastSyncAt ? <p className="text-xs text-slate-500">Updated</p> : null}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- --run src/hooks/__tests__/useWorkspaceData.test.jsx src/components/pages/__tests__/WalletView.test.jsx`

Expected: PASS with `/api/auth/me` and `/api/users/balance/me` used by the hook and the wallet screen rendered as read-only.

- [ ] **Step 5: Commit**

```bash
git add campus-frontend/src/utils/user.js campus-frontend/src/hooks/useAccountMemory.js campus-frontend/src/hooks/useWorkspaceData.js campus-frontend/src/App.jsx campus-frontend/src/components/AuthScreen.jsx campus-frontend/src/components/pages/WalletView.jsx campus-frontend/src/hooks/__tests__/useWorkspaceData.test.jsx campus-frontend/src/components/pages/__tests__/WalletView.test.jsx
git commit -m "feat: migrate frontend to token auth"
```

### Task 6: Add Admin View and Final Frontend Role Gating

**Files:**
- Create: `campus-frontend/src/components/pages/AdminView.jsx`
- Modify: `campus-frontend/src/App.jsx`
- Modify: `campus-frontend/src/components/layout/BottomNav.jsx`
- Create: `campus-frontend/src/components/pages/__tests__/AdminView.test.jsx`

- [ ] **Step 1: Write the failing admin UI tests**

```jsx
// campus-frontend/src/components/pages/__tests__/AdminView.test.jsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminView from '../AdminView';
import * as api from '../../../services/api';

vi.mock('../../../services/api');

describe('AdminView', () => {
  it('loads users and submits a balance adjustment request', async () => {
    api.apiGet
      .mockResolvedValueOnce({ data: { code: 200, data: [{ id: 1, username: 'runner001', name: 'Runner', balance: 8.5 }] } })
      .mockResolvedValueOnce({ data: { code: 200, data: { id: 1, username: 'runner001', name: 'Runner', balance: 8.5, records: [] } } });
    api.apiPost.mockResolvedValueOnce({ data: { code: 200, data: { id: 1, balance: 18.5, records: [] } } });

    render(<AdminView />);

    await screen.findByText('runner001');
    fireEvent.click(screen.getByText('runner001'));
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '10.00' } });
    fireEvent.change(screen.getByLabelText(/Reason/i), { target: { value: 'manual top-up' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Adjustment/i }));

    await waitFor(() => {
      expect(api.apiPost).toHaveBeenCalledWith('/api/admin/users/1/balance-adjustments', {
        amount: '10.00',
        reason: 'manual top-up',
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- --run src/components/pages/__tests__/AdminView.test.jsx`

Expected: FAIL because `AdminView` and the admin-only navigation path do not exist yet.

- [ ] **Step 3: Write minimal admin UI implementation**

```jsx
// campus-frontend/src/components/pages/AdminView.jsx
export default function AdminView() {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    apiGet(`/api/admin/users?keyword=${encodeURIComponent(keyword)}`).then((response) => {
      setUsers(Array.isArray(response.data.data) ? response.data.data : []);
    });
  }, [keyword]);

  const handleSelectUser = async (userId) => {
    const response = await apiGet(`/api/admin/users/${userId}`);
    setSelectedUser(response.data.data);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const response = await apiPost(`/api/admin/users/${selectedUser.id}/balance-adjustments`, { amount, reason });
    setSelectedUser(response.data.data);
    setAmount('');
    setReason('');
  };

  return (
    <section className="space-y-4">
      <label>
        Search
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      </label>
      <div className="grid gap-3 md:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {users.map((user) => (
            <button key={user.id} type="button" onClick={() => handleSelectUser(user.id)}>
              {user.username}
            </button>
          ))}
        </div>
        {selectedUser ? (
          <div className="space-y-3">
            <h2>{selectedUser.username}</h2>
            <p>Balance: {selectedUser.balance}</p>
            <form onSubmit={handleSubmit} className="space-y-2">
              <label>
                Amount
                <input value={amount} onChange={(event) => setAmount(event.target.value)} />
              </label>
              <label>
                Reason
                <input value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
              <button type="submit">Submit Adjustment</button>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
```

```jsx
// campus-frontend/src/App.jsx
const isAdmin = currentUser.role === 'ADMIN';

if (activeTab === 'admin' && isAdmin) {
  return <AdminView />;
}
```

```jsx
// campus-frontend/src/components/layout/BottomNav.jsx
export default function BottomNav({ activeTab, hasUnreadMessages, isAdmin, onSelectTab }) {
const tabs = [
  { id: 'home', label: '首页' },
  { id: 'tasks', label: '订单' },
  { id: 'post', label: '发布' },
  { id: 'messages', label: '消息' },
  ...(isAdmin ? [{ id: 'admin', label: '管理' }] : []),
  { id: 'profile', label: '我的' },
];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test -- --run src/components/pages/__tests__/AdminView.test.jsx`

Expected: PASS with the admin page loading users, fetching a selected profile, and posting balance adjustments to the admin endpoint.

- [ ] **Step 5: Commit**

```bash
git add campus-frontend/src/components/pages/AdminView.jsx campus-frontend/src/App.jsx campus-frontend/src/components/layout/BottomNav.jsx campus-frontend/src/components/pages/__tests__/AdminView.test.jsx
git commit -m "feat: add admin balance management ui"
```

## Final Verification

- [ ] Run backend security suite

```bash
cd campus-backend
.\mvnw.cmd test
```

Expected: PASS with `SecurityBootstrapTests`, `AuthControllerTests`, `SecuredBusinessFlowTests`, and existing regression tests all green.

- [ ] Run frontend unit tests

```bash
cd campus-frontend
npm.cmd test -- --run
```

Expected: PASS with auth/session, wallet, workspace, and admin view tests all green.

- [ ] Run frontend production build

```bash
cd campus-frontend
npm.cmd run build
```

Expected: PASS and emit a `dist/` bundle without unresolved imports.

- [ ] Run packaged application build

```bash
cd .
.\build-software.ps1
```

Expected: PASS and refresh `release\campus-backend-0.0.1-SNAPSHOT.jar`.

- [ ] Smoke-test login and admin actions manually

```text
1. Start MySQL locally.
2. Fill config\application-local.properties with JWT secret and admin credentials.
3. Run .\run-software.ps1.
4. Register a normal user, log in, create a task, and confirm the wallet page shows no recharge form.
5. Log in as the configured admin, open the admin tab, adjust the normal user's balance, and confirm the updated history appears.
6. Open the public tunnel only after the above passes.
```
