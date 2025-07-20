/**
 * 🔒 Security Headers - Context7 Optimized
 *
 * Context7 Pattern: Comprehensive Security Headers Management
 * - OWASP recommended security headers
 * - Content Security Policy (CSP)
 * - Cross-origin policies
 * - Security best practices
 */

class SecurityHeaders {
  constructor(options = {}) {
    this.options = {
      csp: {
        enabled: true,
        directives: {
          'default-src': ['\'self\''],
          'script-src': ['\'self\'', '\'unsafe-inline\''],
          'style-src': ['\'self\'', '\'unsafe-inline\''],
          'img-src': ['\'self\'', 'data:', 'https:'],
          'font-src': ['\'self\''],
          'connect-src': ['\'self\'', 'https://prices.runescape.wiki'],
          'frame-ancestors': ['\'none\''],
          'base-uri': ['\'self\''],
          'object-src': ['\'none\'']
        },
        ...options.csp
      },
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
        ...options.hsts
      },
      frameOptions: {
        enabled: true,
        policy: 'DENY',
        ...options.frameOptions
      },
      contentTypeOptions: {
        enabled: true,
        ...options.contentTypeOptions
      },
      referrerPolicy: {
        enabled: true,
        policy: 'strict-origin-when-cross-origin',
        ...options.referrerPolicy
      },
      crossOriginPolicies: {
        enabled: true,
        embedderPolicy: 'require-corp',
        openerPolicy: 'same-origin',
        resourcePolicy: 'same-origin',
        ...options.crossOriginPolicies
      },
      ...options
    };

    this.appliedHeaders = {};
  }

  /**
   * Context7 Pattern: Apply all security headers
   */
  applyHeaders(res) {
    this.appliedHeaders = {};

    // Content Security Policy
    if (this.options.csp.enabled) {
      const csp = this.buildCSP();
      res.setHeader('Content-Security-Policy', csp);
      this.appliedHeaders['Content-Security-Policy'] = csp;
    }

    // HTTP Strict Transport Security
    if (this.options.hsts.enabled) {
      const hsts = this.buildHSTS();
      res.setHeader('Strict-Transport-Security', hsts);
      this.appliedHeaders['Strict-Transport-Security'] = hsts;
    }

    // X-Frame-Options
    if (this.options.frameOptions.enabled) {
      res.setHeader('X-Frame-Options', this.options.frameOptions.policy);
      this.appliedHeaders['X-Frame-Options'] = this.options.frameOptions.policy;
    }

    // X-Content-Type-Options
    if (this.options.contentTypeOptions.enabled) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      this.appliedHeaders['X-Content-Type-Options'] = 'nosniff';
    }

    // X-XSS-Protection (deprecated but still used)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    this.appliedHeaders['X-XSS-Protection'] = '1; mode=block';

    // Referrer Policy
    if (this.options.referrerPolicy.enabled) {
      res.setHeader('Referrer-Policy', this.options.referrerPolicy.policy);
      this.appliedHeaders['Referrer-Policy'] = this.options.referrerPolicy.policy;
    }

    // Cross-Origin Policies
    if (this.options.crossOriginPolicies.enabled) {
      const policies = this.buildCrossOriginPolicies();
      Object.entries(policies).forEach(([header, value]) => {
        res.setHeader(header, value);
        this.appliedHeaders[header] = value;
      });
    }

    // Permissions Policy (formerly Feature Policy)
    const permissionsPolicy = this.buildPermissionsPolicy();
    res.setHeader('Permissions-Policy', permissionsPolicy);
    this.appliedHeaders['Permissions-Policy'] = permissionsPolicy;

    // Remove server identification
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Powered-By', 'Context7-OSRS-Market');
    this.appliedHeaders['X-Powered-By'] = 'Context7-OSRS-Market';

    // Cache control for security-sensitive responses
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    this.appliedHeaders['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    this.appliedHeaders['Pragma'] = 'no-cache';
    this.appliedHeaders['Expires'] = '0';
  }

  /**
   * Context7 Pattern: Build Content Security Policy
   */
  buildCSP() {
    const directives = [];

    for (const [directive, sources] of Object.entries(this.options.csp.directives)) {
      if (Array.isArray(sources)) {
        directives.push(`${directive} ${sources.join(' ')}`);
      } else {
        directives.push(`${directive} ${sources}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * Context7 Pattern: Build HSTS header
   */
  buildHSTS() {
    const parts = [`max-age=${this.options.hsts.maxAge}`];

    if (this.options.hsts.includeSubDomains) {
      parts.push('includeSubDomains');
    }

    if (this.options.hsts.preload) {
      parts.push('preload');
    }

    return parts.join('; ');
  }

  /**
   * Context7 Pattern: Build Cross-Origin Policies
   */
  buildCrossOriginPolicies() {
    const policies = {};

    if (this.options.crossOriginPolicies.embedderPolicy) {
      policies['Cross-Origin-Embedder-Policy'] = this.options.crossOriginPolicies.embedderPolicy;
    }

    if (this.options.crossOriginPolicies.openerPolicy) {
      policies['Cross-Origin-Opener-Policy'] = this.options.crossOriginPolicies.openerPolicy;
    }

    if (this.options.crossOriginPolicies.resourcePolicy) {
      policies['Cross-Origin-Resource-Policy'] = this.options.crossOriginPolicies.resourcePolicy;
    }

    return policies;
  }

  /**
   * Context7 Pattern: Build Permissions Policy
   */
  buildPermissionsPolicy() {
    const permissions = [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=()',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ];

    return permissions.join(', ');
  }

  /**
   * Context7 Pattern: Get applied headers
   */
  getAppliedHeaders() {
    return { ...this.appliedHeaders };
  }

  /**
   * Context7 Pattern: Update CSP directive
   */
  updateCSPDirective(directive, sources) {
    if (!this.options.csp.directives) {
      this.options.csp.directives = {};
    }

    this.options.csp.directives[directive] = sources;
  }

  /**
   * Context7 Pattern: Add CSP source to directive
   */
  addCSPSource(directive, source) {
    if (!this.options.csp.directives[directive]) {
      this.options.csp.directives[directive] = [];
    }

    if (!this.options.csp.directives[directive].includes(source)) {
      this.options.csp.directives[directive].push(source);
    }
  }

  /**
   * Context7 Pattern: Remove CSP source from directive
   */
  removeCSPSource(directive, source) {
    if (this.options.csp.directives[directive]) {
      this.options.csp.directives[directive] =
        this.options.csp.directives[directive].filter(s => s !== source);
    }
  }

  /**
   * Context7 Pattern: Enable/disable security feature
   */
  toggleFeature(feature, enabled) {
    if (this.options[feature]) {
      this.options[feature].enabled = enabled;
    }
  }

  /**
   * Context7 Pattern: Get security configuration
   */
  getConfiguration() {
    return {
      csp: this.options.csp,
      hsts: this.options.hsts,
      frameOptions: this.options.frameOptions,
      contentTypeOptions: this.options.contentTypeOptions,
      referrerPolicy: this.options.referrerPolicy,
      crossOriginPolicies: this.options.crossOriginPolicies
    };
  }

  /**
   * Context7 Pattern: Validate security configuration
   */
  validateConfiguration() {
    const issues = [];

    // Check CSP
    if (this.options.csp.enabled) {
      if (!this.options.csp.directives['default-src']) {
        issues.push('CSP: default-src directive is missing');
      }

      if (this.options.csp.directives['script-src'] &&
          this.options.csp.directives['script-src'].includes('\'unsafe-eval\'')) {
        issues.push('CSP: unsafe-eval in script-src reduces security');
      }
    }

    // Check HSTS
    if (this.options.hsts.enabled) {
      if (this.options.hsts.maxAge < 86400) { // 1 day
        issues.push('HSTS: max-age should be at least 86400 seconds (1 day)');
      }
    }

    // Check Frame Options
    if (this.options.frameOptions.enabled) {
      const validPolicies = ['DENY', 'SAMEORIGIN'];
      if (!validPolicies.includes(this.options.frameOptions.policy)) {
        issues.push('Frame Options: policy should be DENY or SAMEORIGIN');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Context7 Pattern: Get security recommendations
   */
  getRecommendations() {
    const recommendations = [];

    // CSP recommendations
    if (this.options.csp.enabled) {
      if (this.options.csp.directives['script-src'] &&
          this.options.csp.directives['script-src'].includes('\'unsafe-inline\'')) {
        recommendations.push('Consider removing unsafe-inline from script-src for better security');
      }
    }

    // HSTS recommendations
    if (this.options.hsts.enabled && this.options.hsts.maxAge < 31536000) {
      recommendations.push('Consider increasing HSTS max-age to 31536000 (1 year)');
    }

    return recommendations;
  }

  /**
   * Context7 Pattern: Create security report
   */
  generateSecurityReport() {
    const validation = this.validateConfiguration();
    const recommendations = this.getRecommendations();

    return {
      timestamp: new Date().toISOString(),
      configuration: this.getConfiguration(),
      appliedHeaders: this.getAppliedHeaders(),
      validation,
      recommendations,
      summary: {
        totalHeaders: Object.keys(this.appliedHeaders).length,
        cspEnabled: this.options.csp.enabled,
        hstsEnabled: this.options.hsts.enabled,
        frameProtection: this.options.frameOptions.enabled,
        contentTypeProtection: this.options.contentTypeOptions.enabled,
        crossOriginProtection: this.options.crossOriginPolicies.enabled
      }
    };
  }
}

module.exports = { SecurityHeaders };
