import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  Shield, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  Bug, 
  Eye,
  FileCode,
  Search,
  Filter
} from 'lucide-react';
import Editor from '@monaco-editor/react';

interface BugPattern {
  id: string;
  type: 'logical' | 'runtime' | 'memory' | 'concurrency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  column: number;
  message: string;
  description: string;
  suggestion: string;
  confidence: number;
}

interface PerformanceIssue {
  id: string;
  type: 'n_squared' | 'memory_leak' | 'blocking_call' | 'inefficient_query';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  impact: number;
  description: string;
  solution: string;
  estimatedImprovement: string;
}

interface SecurityVulnerability {
  id: string;
  type: 'xss' | 'sql_injection' | 'csrf' | 'insecure_dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  cwe: string;
  description: string;
  remediation: string;
  riskScore: number;
}

interface RefactoringOpportunity {
  id: string;
  type: 'extract_method' | 'remove_duplication' | 'simplify_conditional' | 'rename_variable';
  priority: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}

interface ComplexityMetric {
  file: string;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: number;
}

const CodeAnalyzer: React.FC = () => {
  const [analysisType, setAnalysisType] = useState<string>('all');
  const [targetPath, setTargetPath] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('bugs');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Mock data
  const [bugPatterns, setBugPatterns] = useState<BugPattern[]>([]);
  const [performanceIssues, setPerformanceIssues] = useState<PerformanceIssue[]>([]);
  const [securityVulnerabilities, setSecurityVulnerabilities] = useState<SecurityVulnerability[]>([]);
  const [refactoringOpportunities, setRefactoringOpportunities] = useState<RefactoringOpportunity[]>([]);
  const [complexityMetrics, setComplexityMetrics] = useState<ComplexityMetric[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');

  const analysisTypes = [
    { value: 'all', label: 'Complete Analysis' },
    { value: 'bugs', label: 'Bug Detection' },
    { value: 'performance', label: 'Performance Analysis' },
    { value: 'security', label: 'Security Scan' },
    { value: 'refactoring', label: 'Refactoring Analysis' },
    { value: 'complexity', label: 'Complexity Metrics' }
  ];

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Simulate analysis
    setTimeout(() => {
      const mockBugPatterns: BugPattern[] = [
        {
          id: 'bug-1',
          type: 'logical',
          severity: 'high',
          file: 'src/utils/validation.ts',
          line: 45,
          column: 12,
          message: 'Potential null pointer dereference',
          description: 'Variable may be null when accessed',
          suggestion: 'Add null check before accessing property',
          confidence: 92
        },
        {
          id: 'bug-2',
          type: 'runtime',
          severity: 'medium',
          file: 'src/components/DataTable.tsx',
          line: 78,
          column: 8,
          message: 'Array index out of bounds',
          description: 'Accessing array without bounds checking',
          suggestion: 'Validate array length before access',
          confidence: 87
        },
        {
          id: 'bug-3',
          type: 'memory',
          severity: 'critical',
          file: 'src/services/cache.ts',
          line: 123,
          column: 15,
          message: 'Memory leak detected',
          description: 'Event listener not properly removed',
          suggestion: 'Add cleanup in component unmount',
          confidence: 95
        }
      ];

      const mockPerformanceIssues: PerformanceIssue[] = [
        {
          id: 'perf-1',
          type: 'n_squared',
          severity: 'high',
          file: 'src/algorithms/sort.ts',
          line: 34,
          impact: 85,
          description: 'Nested loops causing O(n²) complexity',
          solution: 'Use Map or Set for faster lookups',
          estimatedImprovement: '70% faster'
        },
        {
          id: 'perf-2',
          type: 'blocking_call',
          severity: 'medium',
          file: 'src/api/client.ts',
          line: 67,
          impact: 60,
          description: 'Synchronous API call blocking main thread',
          solution: 'Make API call asynchronous',
          estimatedImprovement: '40% better responsiveness'
        }
      ];

      const mockSecurityVulnerabilities: SecurityVulnerability[] = [
        {
          id: 'sec-1',
          type: 'xss',
          severity: 'critical',
          file: 'src/components/UserInput.tsx',
          line: 89,
          cwe: 'CWE-79',
          description: 'Unescaped user input rendered in DOM',
          remediation: 'Sanitize user input before rendering',
          riskScore: 9.1
        },
        {
          id: 'sec-2',
          type: 'insecure_dependency',
          severity: 'high',
          file: 'package.json',
          line: 23,
          cwe: 'CWE-1104',
          description: 'Using vulnerable version of library',
          remediation: 'Update to latest secure version',
          riskScore: 7.8
        }
      ];

      const mockRefactoringOpportunities: RefactoringOpportunity[] = [
        {
          id: 'refactor-1',
          type: 'extract_method',
          priority: 'high',
          file: 'src/components/Dashboard.tsx',
          line: 156,
          description: 'Large method with multiple responsibilities',
          benefit: 'Improved readability and testability',
          effort: 'medium'
        },
        {
          id: 'refactor-2',
          type: 'remove_duplication',
          priority: 'medium',
          file: 'src/utils/formatters.ts',
          line: 45,
          description: 'Duplicate code in multiple functions',
          benefit: 'Reduced maintenance burden',
          effort: 'low'
        }
      ];

      const mockComplexityMetrics: ComplexityMetric[] = [
        {
          file: 'src/components/Dashboard.tsx',
          cyclomaticComplexity: 15,
          cognitiveComplexity: 23,
          linesOfCode: 450,
          maintainabilityIndex: 62,
          technicalDebt: 2.5
        },
        {
          file: 'src/services/dataProcessor.ts',
          cyclomaticComplexity: 22,
          cognitiveComplexity: 31,
          linesOfCode: 680,
          maintainabilityIndex: 45,
          technicalDebt: 4.2
        }
      ];

      setBugPatterns(mockBugPatterns);
      setPerformanceIssues(mockPerformanceIssues);
      setSecurityVulnerabilities(mockSecurityVulnerabilities);
      setRefactoringOpportunities(mockRefactoringOpportunities);
      setComplexityMetrics(mockComplexityMetrics);
      setIsAnalyzing(false);
    }, 3000);
  }, [analysisType, targetPath]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getComplexityColor = (value: number, threshold: { low: number, medium: number }) => {
    if (value <= threshold.low) return 'text-green-600';
    if (value <= threshold.medium) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredBugPatterns = bugPatterns.filter(bug => 
    (filterSeverity === 'all' || bug.severity === filterSeverity) &&
    (searchQuery === '' || bug.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
     bug.file.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPerformanceIssues = performanceIssues.filter(issue => 
    (filterSeverity === 'all' || issue.severity === filterSeverity) &&
    (searchQuery === '' || issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
     issue.file.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSecurityVulnerabilities = securityVulnerabilities.filter(vuln => 
    (filterSeverity === 'all' || vuln.severity === filterSeverity) &&
    (searchQuery === '' || vuln.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
     vuln.file.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Analysis Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            Code Intelligence Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Analysis Type</label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {analysisTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Path</label>
              <Input
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder="src/ or specific file path"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <Button 
                onClick={runAnalysis} 
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {bugPatterns.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="bugs" className="flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Bugs ({filteredBugPatterns.length})
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance ({filteredPerformanceIssues.length})
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security ({filteredSecurityVulnerabilities.length})
                </TabsTrigger>
                <TabsTrigger value="refactoring" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refactoring ({refactoringOpportunities.length})
                </TabsTrigger>
                <TabsTrigger value="complexity" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Complexity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bugs" className="space-y-4">
                {filteredBugPatterns.map((bug) => (
                  <Card key={bug.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <h4 className="font-medium">{bug.message}</h4>
                            <p className="text-sm text-gray-600">{bug.file}:{bug.line}:{bug.column}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(bug.severity) as any}>
                            {bug.severity}
                          </Badge>
                          <Badge variant="outline">{bug.type}</Badge>
                          <Badge variant="secondary">{bug.confidence}% confidence</Badge>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{bug.description}</p>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Suggestion:</p>
                        <p className="text-sm">{bug.suggestion}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                {filteredPerformanceIssues.map((issue) => (
                  <Card key={issue.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          <div>
                            <h4 className="font-medium">{issue.description}</h4>
                            <p className="text-sm text-gray-600">{issue.file}:{issue.line}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(issue.severity) as any}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline">{issue.type}</Badge>
                          <Badge variant="secondary">{issue.impact}% impact</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Solution:</p>
                          <p className="text-sm">{issue.solution}</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Expected Improvement:</p>
                          <p className="text-sm">{issue.estimatedImprovement}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                {filteredSecurityVulnerabilities.map((vuln) => (
                  <Card key={vuln.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-red-500" />
                          <div>
                            <h4 className="font-medium">{vuln.description}</h4>
                            <p className="text-sm text-gray-600">{vuln.file}:{vuln.line}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(vuln.severity) as any}>
                            {vuln.severity}
                          </Badge>
                          <Badge variant="outline">{vuln.type}</Badge>
                          <Badge variant="secondary">{vuln.cwe}</Badge>
                          <Badge variant="destructive">{vuln.riskScore}/10</Badge>
                        </div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Remediation:</p>
                        <p className="text-sm">{vuln.remediation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="refactoring" className="space-y-4">
                {refactoringOpportunities.map((opportunity) => (
                  <Card key={opportunity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <RefreshCw className="h-5 w-5 text-blue-500" />
                          <div>
                            <h4 className="font-medium">{opportunity.description}</h4>
                            <p className="text-sm text-gray-600">{opportunity.file}:{opportunity.line}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={opportunity.priority === 'high' ? 'destructive' : 'default'}>
                            {opportunity.priority} priority
                          </Badge>
                          <Badge variant="outline">{opportunity.type}</Badge>
                          <Badge variant="secondary">{opportunity.effort} effort</Badge>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">Benefit:</p>
                        <p className="text-sm">{opportunity.benefit}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="complexity" className="space-y-4">
                {complexityMetrics.map((metric, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{metric.file}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getComplexityColor(metric.cyclomaticComplexity, { low: 10, medium: 20 })}`}>
                            {metric.cyclomaticComplexity}
                          </div>
                          <p className="text-sm text-gray-600">Cyclomatic Complexity</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getComplexityColor(metric.cognitiveComplexity, { low: 15, medium: 25 })}`}>
                            {metric.cognitiveComplexity}
                          </div>
                          <p className="text-sm text-gray-600">Cognitive Complexity</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {metric.linesOfCode}
                          </div>
                          <p className="text-sm text-gray-600">Lines of Code</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getComplexityColor(100 - metric.maintainabilityIndex, { low: 30, medium: 50 })}`}>
                            {metric.maintainabilityIndex}
                          </div>
                          <p className="text-sm text-gray-600">Maintainability Index</p>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${getComplexityColor(metric.technicalDebt, { low: 2, medium: 4 })}`}>
                            {metric.technicalDebt}h
                          </div>
                          <p className="text-sm text-gray-600">Technical Debt</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Code Preview */}
      {selectedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Code Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Editor
                height="400px"
                language="typescript"
                value={selectedCode}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CodeAnalyzer;