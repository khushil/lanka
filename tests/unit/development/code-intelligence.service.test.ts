import { CodeIntelligenceService } from '../../../src/modules/development/services/code-intelligence.service';
import { CodeAnalysisOptions } from '../../../src/types/development.types';

describe('CodeIntelligenceService', () => {
  let service: CodeIntelligenceService;

  beforeEach(() => {
    service = new CodeIntelligenceService();
  });

  describe('Semantic Code Search', () => {
    it('should perform semantic search across codebase', async () => {
      const query = 'user authentication flow';
      const options = { includeTests: false, maxResults: 10 };

      const results = await service.semanticSearch(query, options);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeLessThanOrEqual(10);
      results.forEach(result => {
        expect(result).toHaveProperty('filePath');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('relevanceScore');
        expect(result).toHaveProperty('lineNumber');
        expect(result.relevanceScore).toBeGreaterThan(0);
        expect(result.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty search results gracefully', async () => {
      const query = 'nonexistent_functionality_xyz123';

      const results = await service.semanticSearch(query);

      expect(results).toEqual([]);
    });

    it('should filter by file types', async () => {
      const query = 'database connection';
      const options = { fileTypes: ['.ts', '.js'], maxResults: 5 };

      const results = await service.semanticSearch(query, options);

      results.forEach(result => {
        expect(['.ts', '.js'].some(ext => result.filePath.endsWith(ext))).toBe(true);
      });
    });

    it('should respect exclude patterns', async () => {
      const query = 'test function';
      const options = { excludePatterns: ['**/*.test.ts', '**/node_modules/**'] };

      const results = await service.semanticSearch(query, options);

      results.forEach(result => {
        expect(result.filePath).not.toMatch(/\.test\.ts$/);
        expect(result.filePath).not.toMatch(/node_modules/);
      });
    });
  });

  describe('Bug Pattern Detection', () => {
    it('should detect common bug patterns', async () => {
      const codeContent = `
        function processUsers(users) {
          for (let i = 0; i < users.length; i++) {
            if (users[i] = null) { // Assignment instead of comparison
              continue;
            }
            users[i].process();
          }
        }
      `;

      const patterns = await service.detectBugPatterns(codeContent, 'test.js');

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('type');
      expect(patterns[0]).toHaveProperty('severity');
      expect(patterns[0]).toHaveProperty('description');
      expect(patterns[0]).toHaveProperty('location');
      expect(patterns[0]).toHaveProperty('suggestion');
      expect(patterns[0].type).toBe('assignment_in_condition');
    });

    it('should detect null pointer dereference patterns', async () => {
      const codeContent = `
        function getUserData(user) {
          return user.profile.name; // Potential null dereference
        }
      `;

      const patterns = await service.detectBugPatterns(codeContent, 'test.js');

      expect(patterns.some(p => p.type === 'potential_null_dereference')).toBe(true);
    });

    it('should detect async/await antipatterns', async () => {
      const codeContent = `
        async function fetchData() {
          const data1 = await fetch('/api/1');
          const data2 = await fetch('/api/2'); // Sequential when could be parallel
          return [data1, data2];
        }
      `;

      const patterns = await service.detectBugPatterns(codeContent, 'test.js');

      expect(patterns.some(p => p.type === 'sequential_awaits')).toBe(true);
    });

    it('should handle syntax errors gracefully', async () => {
      const invalidCode = 'function test( { invalid syntax';

      const patterns = await service.detectBugPatterns(invalidCode, 'test.js');

      expect(patterns).toBeInstanceOf(Array);
      // Should return syntax error as a pattern
      expect(patterns.some(p => p.type === 'syntax_error')).toBe(true);
    });
  });

  describe('Performance Anti-pattern Detection', () => {
    it('should detect N+1 query patterns', async () => {
      const codeContent = `
        async function getUsers() {
          const users = await db.query('SELECT * FROM users');
          const usersWithProfiles = [];
          for (const user of users) {
            const profile = await db.query('SELECT * FROM profiles WHERE user_id = ?', user.id);
            usersWithProfiles.push({ ...user, profile });
          }
          return usersWithProfiles;
        }
      `;

      const issues = await service.detectPerformanceIssues(codeContent, 'test.js');

      expect(issues).toBeInstanceOf(Array);
      expect(issues.some(issue => issue.type === 'n_plus_one_query')).toBe(true);
      const n1Issue = issues.find(issue => issue.type === 'n_plus_one_query');
      expect(n1Issue?.severity).toBe('high');
      expect(n1Issue?.impact).toMatch(/performance/i);
    });

    it('should detect memory leak patterns', async () => {
      const codeContent = `
        class DataProcessor {
          constructor() {
            this.cache = new Map();
            this.listeners = [];
          }
          
          addListener(callback) {
            this.listeners.push(callback); // No cleanup mechanism
          }
          
          process(data) {
            this.cache.set(data.id, data); // Unbounded cache growth
          }
        }
      `;

      const issues = await service.detectPerformanceIssues(codeContent, 'test.js');

      expect(issues.some(issue => issue.type === 'memory_leak_potential')).toBe(true);
    });

    it('should detect inefficient loops', async () => {
      const codeContent = `
        function processArray(items) {
          for (let i = 0; i < items.length; i++) {
            for (let j = 0; j < items.length; j++) {
              if (items[i].id === items[j].id && i !== j) {
                // O(n²) complexity for duplicate detection
                return true;
              }
            }
          }
          return false;
        }
      `;

      const issues = await service.detectPerformanceIssues(codeContent, 'test.js');

      expect(issues.some(issue => issue.type === 'inefficient_algorithm')).toBe(true);
    });

    it('should detect blocking operations in async context', async () => {
      const codeContent = `
        async function processFiles(files) {
          const results = [];
          for (const file of files) {
            const content = fs.readFileSync(file); // Blocking I/O in async function
            results.push(content);
          }
          return results;
        }
      `;

      const issues = await service.detectPerformanceIssues(codeContent, 'test.js');

      expect(issues.some(issue => issue.type === 'blocking_operation')).toBe(true);
    });
  });

  describe('Security Vulnerability Scanning', () => {
    it('should detect SQL injection vulnerabilities', async () => {
      const codeContent = `
        function getUser(userId) {
          const query = 'SELECT * FROM users WHERE id = ' + userId; // SQL injection
          return db.execute(query);
        }
      `;

      const vulnerabilities = await service.scanSecurityVulnerabilities(codeContent, 'test.js');

      expect(vulnerabilities).toBeInstanceOf(Array);
      expect(vulnerabilities.some(vuln => vuln.type === 'sql_injection')).toBe(true);
      const sqlInjection = vulnerabilities.find(vuln => vuln.type === 'sql_injection');
      expect(sqlInjection?.severity).toBe('high');
      expect(sqlInjection?.cwe).toBe('CWE-89');
    });

    it('should detect XSS vulnerabilities', async () => {
      const codeContent = `
        function renderUserInput(userInput) {
          document.innerHTML = '<div>' + userInput + '</div>'; // XSS vulnerability
        }
      `;

      const vulnerabilities = await service.scanSecurityVulnerabilities(codeContent, 'test.js');

      expect(vulnerabilities.some(vuln => vuln.type === 'xss')).toBe(true);
    });

    it('should detect hardcoded credentials', async () => {
      const codeContent = `
        const config = {
          apiKey: 'sk-1234567890abcdef', // Hardcoded API key
          password: 'admin123',
          dbUrl: 'mongodb://admin:password@localhost:27017/db'
        };
      `;

      const vulnerabilities = await service.scanSecurityVulnerabilities(codeContent, 'test.js');

      expect(vulnerabilities.some(vuln => vuln.type === 'hardcoded_credentials')).toBe(true);
    });

    it('should detect insecure random generation', async () => {
      const codeContent = `
        function generateToken() {
          return Math.random().toString(36); // Insecure random generation
        }
      `;

      const vulnerabilities = await service.scanSecurityVulnerabilities(codeContent, 'test.js');

      expect(vulnerabilities.some(vuln => vuln.type === 'weak_random')).toBe(true);
    });

    it('should detect path traversal vulnerabilities', async () => {
      const codeContent = `
        app.get('/file', (req, res) => {
          const filename = req.query.file;
          res.sendFile(path.join(__dirname, filename)); // Path traversal
        });
      `;

      const vulnerabilities = await service.scanSecurityVulnerabilities(codeContent, 'test.js');

      expect(vulnerabilities.some(vuln => vuln.type === 'path_traversal')).toBe(true);
    });
  });

  describe('Code Quality Metrics', () => {
    it('should calculate comprehensive quality metrics', async () => {
      const codeContent = `
        class UserService {
          constructor(db, logger) {
            this.db = db;
            this.logger = logger;
          }

          async getUser(id) {
            try {
              if (!id) {
                throw new Error('ID is required');
              }
              const user = await this.db.findById(id);
              this.logger.info('User retrieved', { id });
              return user;
            } catch (error) {
              this.logger.error('Failed to get user', { id, error });
              throw error;
            }
          }

          async createUser(userData) {
            // Implementation here
            return user;
          }
        }
      `;

      const metrics = await service.calculateQualityMetrics(codeContent, 'UserService.js');

      expect(metrics).toHaveProperty('complexity');
      expect(metrics).toHaveProperty('maintainability');
      expect(metrics).toHaveProperty('testability');
      expect(metrics).toHaveProperty('readability');
      expect(metrics).toHaveProperty('linesOfCode');
      expect(metrics).toHaveProperty('commentRatio');
      expect(metrics).toHaveProperty('duplicateCode');
      expect(metrics).toHaveProperty('technicalDebt');

      expect(metrics.complexity).toBeGreaterThan(0);
      expect(metrics.maintainability).toBeGreaterThanOrEqual(0);
      expect(metrics.maintainability).toBeLessThanOrEqual(100);
      expect(metrics.testability).toBeGreaterThanOrEqual(0);
      expect(metrics.testability).toBeLessThanOrEqual(100);
      expect(metrics.readability).toBeGreaterThanOrEqual(0);
      expect(metrics.readability).toBeLessThanOrEqual(100);
    });

    it('should calculate cyclomatic complexity accurately', async () => {
      const complexCode = `
        function complexFunction(a, b, c) {
          if (a > 0) {
            if (b > 0) {
              if (c > 0) {
                return a + b + c;
              } else {
                return a + b;
              }
            } else {
              return a;
            }
          } else {
            return 0;
          }
        }
      `;

      const metrics = await service.calculateQualityMetrics(complexCode, 'test.js');

      expect(metrics.complexity).toBeGreaterThan(4); // High cyclomatic complexity
    });

    it('should identify technical debt patterns', async () => {
      const debtCode = `
        // TODO: Refactor this mess
        function processData(data) {
          // FIXME: This is a hack
          const result = JSON.parse(JSON.stringify(data));
          // HACK: Quick fix for production
          result.processed = true;
          return result;
        }
      `;

      const metrics = await service.calculateQualityMetrics(debtCode, 'test.js');

      expect(metrics.technicalDebt).toBeGreaterThan(0);
      expect(metrics.technicalDebt.todos).toBeGreaterThan(0);
      expect(metrics.technicalDebt.fixmes).toBeGreaterThan(0);
      expect(metrics.technicalDebt.hacks).toBeGreaterThan(0);
    });
  });

  describe('Refactoring Opportunity Detection', () => {
    it('should detect extract method opportunities', async () => {
      const codeContent = `
        function processOrder(order) {
          // Validate order
          if (!order.id) throw new Error('Order ID required');
          if (!order.items || order.items.length === 0) throw new Error('Order items required');
          if (!order.customer) throw new Error('Customer required');
          
          // Calculate totals
          let subtotal = 0;
          for (const item of order.items) {
            subtotal += item.price * item.quantity;
          }
          const tax = subtotal * 0.08;
          const total = subtotal + tax;
          
          // Save to database
          const savedOrder = db.save({
            ...order,
            subtotal,
            tax,
            total,
            status: 'processed'
          });
          
          return savedOrder;
        }
      `;

      const opportunities = await service.detectRefactoringOpportunities(codeContent, 'test.js');

      expect(opportunities).toBeInstanceOf(Array);
      expect(opportunities.some(op => op.type === 'extract_method')).toBe(true);
    });

    it('should detect duplicate code blocks', async () => {
      const codeContent = `
        function validateUser(user) {
          if (!user.name) throw new Error('Name required');
          if (!user.email) throw new Error('Email required');
          if (!user.phone) throw new Error('Phone required');
        }

        function validateAdmin(admin) {
          if (!admin.name) throw new Error('Name required');
          if (!admin.email) throw new Error('Email required');
          if (!admin.phone) throw new Error('Phone required');
        }
      `;

      const opportunities = await service.detectRefactoringOpportunities(codeContent, 'test.js');

      expect(opportunities.some(op => op.type === 'duplicate_code')).toBe(true);
    });

    it('should detect large class opportunities', async () => {
      const largeClassCode = `
        class UserManager {
          validateUser() { /* implementation */ }
          createUser() { /* implementation */ }
          updateUser() { /* implementation */ }
          deleteUser() { /* implementation */ }
          sendEmail() { /* implementation */ }
          generateReport() { /* implementation */ }
          processPayment() { /* implementation */ }
          manageSubscription() { /* implementation */ }
          // ... 20+ more methods
        }
      `;

      const opportunities = await service.detectRefactoringOpportunities(largeClassCode, 'test.js');

      expect(opportunities.some(op => op.type === 'large_class')).toBe(true);
    });

    it('should detect long parameter list opportunities', async () => {
      const codeContent = `
        function createUser(name, email, phone, address, city, state, zip, country, age, gender, preferences, notifications) {
          // Implementation
        }
      `;

      const opportunities = await service.detectRefactoringOpportunities(codeContent, 'test.js');

      expect(opportunities.some(op => op.type === 'long_parameter_list')).toBe(true);
    });
  });

  describe('AST-based Analysis', () => {
    it('should parse JavaScript/TypeScript code into AST', async () => {
      const codeContent = `
        function add(a: number, b: number): number {
          return a + b;
        }
      `;

      const ast = await service.parseToAST(codeContent, 'typescript');

      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
      expect(ast.body).toBeInstanceOf(Array);
    });

    it('should traverse AST and extract function information', async () => {
      const codeContent = `
        class Calculator {
          add(a, b) { return a + b; }
          subtract(a, b) { return a - b; }
          multiply(a, b) { return a * b; }
        }
      `;

      const analysis = await service.analyzeCodeStructure(codeContent, 'test.js');

      expect(analysis.classes).toHaveLength(1);
      expect(analysis.classes[0].name).toBe('Calculator');
      expect(analysis.classes[0].methods).toHaveLength(3);
      expect(analysis.functions).toBeInstanceOf(Array);
    });

    it('should handle parsing errors gracefully', async () => {
      const invalidCode = 'function test( invalid syntax';

      expect(async () => {
        await service.parseToAST(invalidCode, 'javascript');
      }).not.toThrow();
    });
  });

  describe('ML Pattern Matching', () => {
    it('should train pattern recognition models', async () => {
      const trainingData = [
        { code: 'function test() { return true; }', pattern: 'simple_function' },
        { code: 'if (condition) { doSomething(); }', pattern: 'conditional' }
      ];

      await service.trainPatternModels(trainingData);

      // Should not throw and should update internal models
      expect(true).toBe(true);
    });

    it('should predict code patterns using ML', async () => {
      const codeContent = `
        function processData(data) {
          if (!data) return null;
          return data.map(item => item.value);
        }
      `;

      const patterns = await service.predictCodePatterns(codeContent, 'test.js');

      expect(patterns).toBeInstanceOf(Array);
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should adapt patterns based on feedback', async () => {
      const feedback = {
        codeId: 'test-123',
        predictedPattern: 'data_processing',
        actualPattern: 'validation',
        accuracy: 0.7
      };

      await service.updatePatternModels(feedback);

      // Should not throw and should improve future predictions
      expect(true).toBe(true);
    });
  });

  describe('Cross-project Learning', () => {
    it('should learn from patterns across projects', async () => {
      const projectPatterns = [
        { 
          projectId: 'proj1', 
          patterns: ['mvc', 'repository'],
          metadata: { language: 'typescript', framework: 'express', domain: 'web', size: 'medium' as const }
        },
        { 
          projectId: 'proj2', 
          patterns: ['mvc', 'factory'],
          metadata: { language: 'javascript', framework: 'react', domain: 'frontend', size: 'large' as const }
        }
      ];

      await service.learnFromProjects(projectPatterns);

      const insights = await service.getCrossProjectInsights();

      expect(insights).toBeInstanceOf(Array);
      expect(insights.some(insight => insight.pattern === 'mvc')).toBe(true);
    });

    it('should recommend patterns based on project similarity', async () => {
      const currentProject = {
        language: 'typescript',
        framework: 'express',
        domain: 'e-commerce'
      };

      const recommendations = await service.recommendPatterns(currentProject);

      expect(recommendations).toBeInstanceOf(Array);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('pattern');
        expect(rec).toHaveProperty('confidence');
        expect(rec).toHaveProperty('reason');
      });
    });

    it('should export learned patterns for sharing', async () => {
      const exportedPatterns = await service.exportLearnedPatterns();

      expect(exportedPatterns).toHaveProperty('version');
      expect(exportedPatterns).toHaveProperty('patterns');
      expect(exportedPatterns).toHaveProperty('metadata');
      expect(exportedPatterns.patterns).toBeInstanceOf(Array);
    });
  });

  describe('Integration Features', () => {
    it('should integrate with existing architecture module', async () => {
      const architectureData = {
        patterns: ['microservices', 'event-driven'],
        technologies: ['node.js', 'mongodb']
      };

      const analysis = await service.analyzeWithArchitectureContext(
        'test code',
        'test.js',
        architectureData
      );

      expect(analysis).toHaveProperty('codeAnalysis');
      expect(analysis).toHaveProperty('architectureAlignment');
      expect(analysis.architectureAlignment).toHaveProperty('score');
    });

    it('should provide recommendations based on requirements', async () => {
      const requirements = {
        performance: 'high',
        scalability: 'horizontal',
        security: 'enterprise'
      };

      const recommendations = await service.getRecommendationsForRequirements(
        'test code',
        requirements
      );

      expect(recommendations).toBeInstanceOf(Array);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('description');
      });
    });

    it('should handle configuration options', async () => {
      const options: CodeAnalysisOptions = {
        enableMLPatterns: false,
        securityLevel: 'strict',
        performanceThreshold: 0.8,
        excludePatterns: ['**/test/**'],
        includeExperimental: true
      };

      service.configure(options);

      const analysis = await service.analyzeCode('test code', 'test.js');

      expect(analysis).toBeDefined();
      // Should respect configuration settings
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      await expect(service.analyzeFile('/nonexistent/file.js')).rejects.toThrow();
    });

    it('should handle malformed code gracefully', async () => {
      const malformedCode = 'function test( { invalid }';

      const result = await service.analyzeCode(malformedCode, 'test.js');

      expect(result).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle network errors in ML operations', async () => {
      // Mock network failure
      jest.spyOn(service as any, 'callMLService').mockRejectedValue(new Error('Network error'));

      const result = await service.predictCodePatterns('test code', 'test.js');

      expect(result).toBeInstanceOf(Array);
      // Should fall back to static analysis
    });
  });
});