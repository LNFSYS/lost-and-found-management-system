package vn.edu.fpt.lnfs.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final String accessSecret;

  public JwtAuthenticationFilter(@Value("${lnfs.jwt.access-secret}") String accessSecret) {
    this.accessSecret = accessSecret;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String authorization = request.getHeader("Authorization");
    if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    if (!StringUtils.hasText(accessSecret) || "YOUR_VALUE_HERE".equals(accessSecret)) {
      response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "JWT_ACCESS_SECRET is not configured");
      return;
    }

    try {
      SecretKey key = Keys.hmacShaKeyFor(accessSecret.getBytes(StandardCharsets.UTF_8));
      Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(authorization.substring(7)).getPayload();
      String userId = claims.getSubject();
      @SuppressWarnings("unchecked")
      List<String> roles = claims.get("roles", List.class);
      Collection<SimpleGrantedAuthority> authorities = roles == null
          ? List.of()
          : roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).collect(Collectors.toList());
      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(userId, null, authorities);
      SecurityContextHolder.getContext().setAuthentication(authentication);
    } catch (RuntimeException ignored) {
      SecurityContextHolder.clearContext();
    }

    filterChain.doFilter(request, response);
  }
}
