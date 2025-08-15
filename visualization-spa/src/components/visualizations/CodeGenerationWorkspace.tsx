import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight,
  Code2,
  FileText,
  Sparkles,
  Download,
  Copy,
  Play,
  RotateCcw,
  Settings,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';

interface CodeGenerationWorkspaceProps {
  viewMode?: 'overview' | 'detailed';
  isLoading?: boolean;
  autoRefresh?: boolean;
}

interface GenerationStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  description: string;
  duration?: number;
}

interface CodeTemplate {
  id: string;
  name: string;
  language: string;
  type: 'component' | 'api' | 'service' | 'utility' | 'test';
  complexity: number;
  estimatedTime: number;
}

interface GenerationMetrics {
  qualityScore: number;
  maintainabilityIndex: number;
  cycloComplexity: number;
  testCoverage: number;
  dependencies: string[];
  suggestions: string[];
}

const CodeGenerationWorkspace: React.FC<CodeGenerationWorkspaceProps> = ({
  viewMode = 'overview',
  isLoading = false,
  autoRefresh = true
}) => {
  const [requirements, setRequirements] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [generationMetrics, setGenerationMetrics] = useState<GenerationMetrics | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(true);
  
  const requirementsRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<any>(null);

  const codeTemplates: CodeTemplate[] = [
    {
      id: 'react-component',
      name: 'React Component',
      language: 'typescript',
      type: 'component',
      complexity: 2,
      estimatedTime: 30
    },
    {
      id: 'rest-api',
      name: 'REST API Endpoint',
      language: 'typescript',
      type: 'api',
      complexity: 3,
      estimatedTime: 45
    },
    {
      id: 'graphql-resolver',
      name: 'GraphQL Resolver',
      language: 'typescript',
      type: 'api',
      complexity: 4,
      estimatedTime: 60
    },
    {
      id: 'service-class',
      name: 'Service Class',
      language: 'typescript',
      type: 'service',
      complexity: 3,
      estimatedTime: 40
    },
    {
      id: 'utility-function',
      name: 'Utility Function',
      language: 'typescript',
      type: 'utility',
      complexity: 1,
      estimatedTime: 20
    },
    {
      id: 'unit-test',
      name: 'Unit Test Suite',
      language: 'typescript',
      type: 'test',
      complexity: 2,
      estimatedTime: 25
    }
  ];

  const languages = [
    { value: 'typescript', label: 'TypeScript', icon: '📘' },
    { value: 'javascript', label: 'JavaScript', icon: '📙' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'go', label: 'Go', icon: '🐹' },
    { value: 'rust', label: 'Rust', icon: '🦀' }
  ];

  const initializeGenerationSteps = () => {
    return [
      {
        id: 'analyze',
        name: 'Analyze Requirements',
        status: 'pending' as const,
        progress: 0,
        description: 'Processing natural language requirements'
      },
      {
        id: 'design',
        name: 'Design Architecture',
        status: 'pending' as const,
        progress: 0,
        description: 'Creating optimal code structure'
      },
      {
        id: 'generate',
        name: 'Generate Code',
        status: 'pending' as const,
        progress: 0,
        description: 'Writing optimized code implementation'
      },
      {
        id: 'validate',
        name: 'Validate Quality',
        status: 'pending' as const,
        progress: 0,
        description: 'Running quality checks and optimizations'
      },
      {
        id: 'finalize',
        name: 'Finalize Output',
        status: 'pending' as const,
        progress: 0,
        description: 'Applying final touches and documentation'
      }
    ];
  };

  const handleGenerate = useCallback(async () => {
    if (!requirements.trim() || !selectedTemplate) return;
    
    setIsGenerating(true);
    setGenerationSteps(initializeGenerationSteps());
    setGeneratedCode('');
    setGenerationMetrics(null);
    
    // Simulate the generation process with realistic timing
    const steps = initializeGenerationSteps();
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Update step to running
      setGenerationSteps(prev => 
        prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s)
      );
      
      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setGenerationSteps(prev => 
          prev.map(s => s.id === step.id ? { ...s, progress } : s)
        );
      }
      
      // Mark as completed
      setGenerationSteps(prev => 
        prev.map(s => s.id === step.id ? { 
          ...s, 
          status: 'completed', 
          duration: Math.floor(Math.random() * 2000) + 1000 
        } : s)
      );
      
      // Generate code when reaching the generate step
      if (step.id === 'generate') {
        const mockCode = generateMockCode();
        setGeneratedCode(mockCode);
      }
      
      // Generate metrics when reaching the validate step
      if (step.id === 'validate') {
        setGenerationMetrics({
          qualityScore: Math.floor(Math.random() * 20) + 80,
          maintainabilityIndex: Math.floor(Math.random() * 15) + 85,
          cycloComplexity: Math.floor(Math.random() * 5) + 2,
          testCoverage: Math.floor(Math.random() * 20) + 75,
          dependencies: ['react', '@types/react', 'typescript'],
          suggestions: [
            'Consider adding error boundaries',
            'Add TypeScript strict mode',
            'Implement proper prop validation',
            'Add accessibility attributes'
          ]
        });
      }
    }
    
    setIsGenerating(false);
  }, [requirements, selectedTemplate, selectedLanguage]);

  const generateMockCode = () => {
    const template = codeTemplates.find(t => t.id === selectedTemplate);
    if (!template) return '';
    
    switch (template.type) {
      case 'component':
        return `import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ${requirements.replace(/\s+/g, '')}Props {
  data?: any[];
  onAction?: (item: any) => void;
  loading?: boolean;
  className?: string;
}

const ${requirements.replace(/\s+/g, '')}Component: React.FC<${requirements.replace(/\s+/g, '')}Props> = ({
  data = [],
  onAction,
  loading = false,
  className
}) => {
  const [localState, setLocalState] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (data.length > 0) {
      setLocalState(data[0]);
    }
  }, [data]);

  const handleAction = async () => {
    if (!onAction || !localState) return;
    
    setIsProcessing(true);
    try {
      await onAction(localState);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={\`w-full \${className}\`}>
      <CardHeader>
        <CardTitle>${requirements || 'Generated Component'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
          
          <Button 
            onClick={handleAction}
            disabled={isProcessing || !localState}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Perform Action'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ${requirements.replace(/\s+/g, '')}Component;`;
      
      case 'api':
        return `import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// ${requirements}
interface ${requirements.replace(/\s+/g, '')}Request {
  id?: string;
  name: string;
  email?: string;
  data?: any;
}

interface ${requirements.replace(/\s+/g, '')}Response {
  success: boolean;
  data?: any;
  message?: string;
  errors?: any[];
}

// Validation middleware
export const validate${requirements.replace(/\s+/g, '')} = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];

// Main handler
export const handle${requirements.replace(/\s+/g, '')} = async (
  req: Request<{}, ${requirements.replace(/\s+/g, '')}Response, ${requirements.replace(/\s+/g, '')}Request>,
  res: Response<${requirements.replace(/\s+/g, '')}Response>
) => {
  try {
    const { name, email, data } = req.body;
    
    // Business logic implementation
    const result = await process${requirements.replace(/\s+/g, '')}({
      name,
      email,
      data
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: '${requirements} processed successfully'
    });
  } catch (error) {
    console.error('${requirements} processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Business logic function
const process${requirements.replace(/\s+/g, '')} = async (input: ${requirements.replace(/\s+/g, '')}Request) => {
  // TODO: Implement your business logic here
  return {
    id: generateId(),
    ...input,
    processedAt: new Date().toISOString()
  };
};

const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};`;
      
      default:
        return `// Generated ${selectedLanguage} code for: ${requirements}

export const ${requirements.toLowerCase().replace(/\s+/g, '')}Utility = (input: any): any => {
  if (!input) {
    throw new Error('Input is required');
  }
  
  // Implementation based on requirements
  const processed = typeof input === 'string' 
    ? input.trim().toLowerCase()
    : JSON.stringify(input);
  
  return {
    processed,
    timestamp: new Date().toISOString(),
    metadata: {
      inputType: typeof input,
      length: processed.length
    }
  };
};`;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const handleDownloadCode = () => {
    const extension = selectedLanguage === 'typescript' ? 'ts' : 
                     selectedLanguage === 'javascript' ? 'js' : 
                     selectedLanguage === 'python' ? 'py' : 'txt';
    
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-code.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepIcon = (status: GenerationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Flow Visualization */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            AI Code Generation in Progress
          </h3>
          
          <div className="space-y-4">
            {generationSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step.status)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{step.name}</span>
                    {step.duration && (
                      <span className="text-xs text-gray-500">
                        {step.duration}ms
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {step.description}
                  </p>
                  
                  {step.status === 'running' && (
                    <Progress value={step.progress} className="h-2" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Workspace */}
      <div className={`grid gap-6 ${splitView ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Requirements Panel */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requirements & Configuration
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSplitView(!splitView)}
              >
                {splitView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Code Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {codeTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.name}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant="outline" className="text-xs">
                            {template.type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            ~{template.estimatedTime}s
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Programming Language</label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <div className="flex items-center gap-2">
                        <span>{lang.icon}</span>
                        {lang.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Requirements Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Describe Your Requirements</label>
              <Textarea
                ref={requirementsRef}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe what you want to build in natural language...\n\nExample: Create a user profile component that displays user information, allows editing, and has a save button with loading states."
                rows={8}
                className="resize-none"
              />
            </div>

            {/* Generation Controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={!requirements.trim() || !selectedTemplate || isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Code
                  </>
                )}
              </Button>
              
              {generatedCode && (
                <Button variant="outline" onClick={() => {
                  setGeneratedCode('');
                  setGenerationMetrics(null);
                  setGenerationSteps([]);
                }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Code Output Panel */}
        {(splitView || generatedCode) && (
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Generated Code
                </CardTitle>
                
                {generatedCode && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadCode}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedCode ? (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      height="400px"
                      language={selectedLanguage}
                      value={generatedCode}
                      onChange={(value) => setGeneratedCode(value || '')}
                      theme="vs-dark"
                      options={{{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        formatOnPaste: true,
                        formatOnType: true
                      }}
                    />
                  </div>
                  
                  {/* Quality Metrics */}
                  {generationMetrics && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Quality Score</span>
                          <span className="font-semibold">{generationMetrics.qualityScore}/100</span>
                        </div>
                        <Progress value={generationMetrics.qualityScore} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Maintainability</span>
                          <span className="font-semibold">{generationMetrics.maintainabilityIndex}/100</span>
                        </div>
                        <Progress value={generationMetrics.maintainabilityIndex} className="h-2" />
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Complexity</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{generationMetrics.cycloComplexity}</span>
                          <Badge variant={generationMetrics.cycloComplexity <= 5 ? 'default' : 'destructive'}>
                            {generationMetrics.cycloComplexity <= 5 ? 'Good' : 'High'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Test Coverage</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{generationMetrics.testCoverage}%</span>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Dependencies & Suggestions */}
                  {generationMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Dependencies</h4>
                        <div className="flex flex-wrap gap-2">
                          {generationMetrics.dependencies.map((dep, index) => (
                            <Badge key={index} variant="secondary">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Suggestions</h4>
                        <div className="space-y-1">
                          {generationMetrics.suggestions.slice(0, 3).map((suggestion, index) => (
                            <div key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-center">
                    <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Generated code will appear here</p>
                    <p className="text-sm mt-1">Describe your requirements and click Generate</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CodeGenerationWorkspace;
