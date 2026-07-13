package vn.edu.fpt.lnfs.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WriteOwnershipConfig implements WebMvcConfigurer {
  private final boolean javaWritesEnabled;

  public WriteOwnershipConfig(@Value("${lnfs.write-enabled:false}") boolean javaWritesEnabled) {
    this.javaWritesEnabled = javaWritesEnabled;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(new WriteOwnershipInterceptor(javaWritesEnabled)).addPathPatterns("/admin/**");
  }

  private static final class WriteOwnershipInterceptor implements HandlerInterceptor {
    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");
    private final boolean enabled;

    private WriteOwnershipInterceptor(boolean enabled) {
      this.enabled = enabled;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
        throws IOException {
      if (enabled || SAFE_METHODS.contains(request.getMethod())) {
        return true;
      }

      response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.getWriter().write(
          "{\"success\":false,\"error\":\"JAVA_WRITES_DISABLED\","
              + "\"message\":\"Node.js owns writes in the current MVP deployment. "
              + "Set JAVA_WRITES_ENABLED=true only after routing this flow to Java.\"}");
      return false;
    }
  }
}
