import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  LinearProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import {
  ArrowForward,
  Code,
  Description,
  AutoAwesome,
  Download,
  ContentCopy,
  PlayArrow,
  Refresh,
  Settings,
  FlashOn,
  CheckCircle,
  Error,
  Schedule,
  TrendingUp,
  Visibility,
  VisibilityOff,
  AutoFixHigh,
  Timer,
  Warning,
  FilePresent,
  RestartAlt
} from '@mui/icons-material';

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
  
  const requirementsRef = useRef<HTMLInputElement>(null);
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
import { Card, CardHeader, CardContent, Typography, Button } from '@mui/material';

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
        <CardContent sx={{ p: 3 }}>
          <Typography>Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} sx={{ width: '100%' }}>
      <CardHeader>
        <Typography variant="h6">${requirements || 'Generated Component'}</Typography>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((item, index) => (
            <div key={index} style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
              <pre style={{ fontSize: 14, overflow: 'auto' }}>
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
          
          <Button 
            onClick={handleAction}
            disabled={isProcessing || !localState}
            variant="contained"
            fullWidth
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
        return <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'running':
        return <Timer sx={{ fontSize: 16, color: 'primary.main' }} />;
      case 'error':
        return <Error sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: 2, borderColor: 'grey.300' }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Generation Flow Visualization */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Paper sx={{ 
            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
            p: 3,
            borderRadius: 2
          }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoFixHigh sx={{ fontSize: 20, color: 'primary.main' }} />
              AI Code Generation in Progress
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {generationSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flexShrink: 0 }}>
                      {getStepIcon(step.status)}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.name}</Typography>
                        {step.duration && (
                          <Typography variant="caption" color="text.secondary">
                            {step.duration}ms
                          </Typography>
                        )}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {step.description}
                      </Typography>
                      
                      {step.status === 'running' && (
                        <LinearProgress variant="determinate" value={step.progress} sx={{ height: 4, borderRadius: 2 }} />
                      )}
                    </Box>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Paper>
        </motion.div>
      )}

      {/* Main Workspace */}
      <Box sx={{ 
        display: 'grid', 
        gap: 3, 
        gridTemplateColumns: splitView ? { lg: '1fr 1fr' } : '1fr'
      }}>
        {/* Requirements Panel */}
        <Card>
          <CardHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilePresent sx={{ fontSize: 20 }} />
                Requirements & Configuration
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSplitView(!splitView)}
              >
                {splitView ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
              </Button>
            </Box>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Template Selection */}
              <FormControl fullWidth>
                <InputLabel>Code Template</InputLabel>
                <Select 
                  value={selectedTemplate} 
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  label="Code Template"
                >
                  {codeTemplates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Typography>{template.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                          <Chip 
                            label={template.type} 
                            variant="outlined" 
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            ~{template.estimatedTime}s
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Language Selection */}
              <FormControl fullWidth>
                <InputLabel>Programming Language</InputLabel>
                <Select 
                  value={selectedLanguage} 
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  label="Programming Language"
                >
                  {languages.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography component="span">{lang.icon}</Typography>
                        <Typography>{lang.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Requirements Input */}
              <TextField
                inputRef={requirementsRef}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                label="Describe Your Requirements"
                placeholder="Describe what you want to build in natural language...

Example: Create a user profile component that displays user information, allows editing, and has a save button with loading states."
                multiline
                rows={8}
                fullWidth
                variant="outlined"
              />

              {/* Generation Controls */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  onClick={handleGenerate}
                  disabled={!requirements.trim() || !selectedTemplate || isGenerating}
                  variant="contained"
                  sx={{ flex: 1 }}
                  startIcon={isGenerating ? <Timer /> : <AutoFixHigh />}
                >
                  {isGenerating ? 'Generating...' : 'Generate Code'}
                </Button>
                
                {generatedCode && (
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      setGeneratedCode('');
                      setGenerationMetrics(null);
                      setGenerationSteps([]);
                    }}
                  >
                    <RestartAlt sx={{ fontSize: 16 }} />
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Code Output Panel */}
        {(splitView || generatedCode) && (
          <Card>
            <CardHeader>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Code sx={{ fontSize: 20 }} />
                  Generated Code
                </Typography>
                
                {generatedCode && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleCopyCode}
                      startIcon={<ContentCopy sx={{ fontSize: 16 }} />}
                    >
                      Copy
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleDownloadCode}
                      startIcon={<Download sx={{ fontSize: 16 }} />}
                    >
                      Download
                    </Button>
                  </Box>
                )}
              </Box>
            </CardHeader>
            <CardContent>
              {generatedCode ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Paper sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <Editor
                      height="400px"
                      language={selectedLanguage}
                      value={generatedCode}
                      onChange={(value) => setGeneratedCode(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        formatOnPaste: true,
                        formatOnType: true
                      }}
                    />
                  </Paper>

                  {/* Quality Metrics */}
                  {generationMetrics && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Paper sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: 2, 
                        p: 2, 
                        backgroundColor: 'grey.50' 
                      }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Quality Score</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{generationMetrics.qualityScore}/100</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={generationMetrics.qualityScore} sx={{ height: 4 }} />
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Maintainability</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{generationMetrics.maintainabilityIndex}/100</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={generationMetrics.maintainabilityIndex} sx={{ height: 4 }} />
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">Complexity</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{generationMetrics.cycloComplexity}</Typography>
                            <Chip 
                              label={generationMetrics.cycloComplexity <= 5 ? 'Good' : 'High'}
                              color={generationMetrics.cycloComplexity <= 5 ? 'success' : 'error'}
                              size="small"
                            />
                          </Box>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">Test Coverage</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{generationMetrics.testCoverage}%</Typography>
                            <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                          </Box>
                        </Box>
                      </Paper>
                    </motion.div>
                  )}

                  {/* Dependencies & Suggestions */}
                  {generationMetrics && (
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
                      gap: 2 
                    }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Dependencies</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {generationMetrics.dependencies.map((dep, index) => (
                            <Chip 
                              key={index} 
                              label={dep}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Suggestions</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {generationMetrics.suggestions.slice(0, 3).map((suggestion, index) => (
                            <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                              <Box sx={{ 
                                width: 6, 
                                height: 6, 
                                backgroundColor: 'primary.main', 
                                borderRadius: '50%', 
                                mt: 1, 
                                flexShrink: 0 
                              }} />
                              <Typography variant="body2" color="text.secondary">
                                {suggestion}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              ) : (
                <Paper sx={{ 
                  height: 320, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: 2, 
                  borderStyle: 'dashed', 
                  borderColor: 'grey.300',
                  backgroundColor: 'transparent'
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Code sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography color="text.secondary">Generated code will appear here</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Describe your requirements and click Generate
                    </Typography>
                  </Box>
                </Paper>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default CodeGenerationWorkspace;