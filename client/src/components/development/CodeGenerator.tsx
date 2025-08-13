import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Code, Download, Eye, Play, Star } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface Template {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'component' | 'service' | 'utility';
  language: string;
  complexity: number;
}

interface GenerationResult {
  code: string;
  language: string;
  qualityScore: number;
  suggestions: string[];
  dependencies: string[];
}

const CodeGenerator: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [language, setLanguage] = useState<string>('typescript');
  const [requirements, setRequirements] = useState<string>('');
  const [architecture, setArchitecture] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'code' | 'preview'>('code');

  const templates: Template[] = [
    {
      id: 'rest-api',
      name: 'REST API Endpoint',
      description: 'Generate RESTful API endpoints with validation',
      type: 'api',
      language: 'typescript',
      complexity: 3
    },
    {
      id: 'react-component',
      name: 'React Component',
      description: 'Generate reusable React components',
      type: 'component',
      language: 'typescript',
      complexity: 2
    },
    {
      id: 'graphql-resolver',
      name: 'GraphQL Resolver',
      description: 'Generate GraphQL resolvers with type safety',
      type: 'api',
      language: 'typescript',
      complexity: 4
    },
    {
      id: 'service-class',
      name: 'Service Class',
      description: 'Generate business logic service classes',
      type: 'service',
      language: 'typescript',
      complexity: 3
    },
    {
      id: 'utility-function',
      name: 'Utility Function',
      description: 'Generate reusable utility functions',
      type: 'utility',
      language: 'typescript',
      complexity: 1
    }
  ];

  const languages = [
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' }
  ];

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    
    // Simulate AI code generation
    setTimeout(() => {
      const mockGeneratedCode = `// Generated ${language.toUpperCase()} code
${selectedTemplate === 'rest-api' ? `
import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

const router = Router();

// ${requirements || 'Generated API endpoint'}
router.post('/api/resource', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email } = req.body;
    
    // Business logic here
    const result = await processResource({ name, email });
    
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
` : selectedTemplate === 'react-component' ? `
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ${requirements ? requirements.replace(/\s+/g, '') : 'Generated'}Props {
  data?: any[];
  onAction?: (item: any) => void;
  loading?: boolean;
}

const ${requirements ? requirements.replace(/\s+/g, '') : 'Generated'}Component: React.FC<${requirements ? requirements.replace(/\s+/g, '') : 'Generated'}Props> = ({
  data = [],
  onAction,
  loading = false
}) => {
  const [localState, setLocalState] = useState<any>(null);

  useEffect(() => {
    // Component initialization
    if (data.length > 0) {
      setLocalState(data[0]);
    }
  }, [data]);

  const handleClick = () => {
    if (onAction && localState) {
      onAction(localState);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>${requirements || 'Generated Component'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="p-4 border rounded">
              <pre>{JSON.stringify(item, null, 2)}</pre>
            </div>
          ))}
          <Button onClick={handleClick}>
            Perform Action
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ${requirements ? requirements.replace(/\s+/g, '') : 'Generated'}Component;
` : `
// Generated utility function
export const ${requirements ? requirements.toLowerCase().replace(/\s+/g, '') : 'generated'}Util = (input: any): any => {
  // Implementation based on requirements: ${requirements || 'Generated functionality'}
  
  if (!input) {
    throw new Error('Input is required');
  }

  // Process input
  const result = typeof input === 'string' 
    ? input.trim().toLowerCase()
    : JSON.stringify(input);

  return {
    processed: result,
    timestamp: new Date().toISOString(),
    metadata: {
      inputType: typeof input,
      length: result.length
    }
  };
};

// Example usage:
// const result = ${requirements ? requirements.toLowerCase().replace(/\s+/g, '') : 'generated'}Util("example input");
`}`;

      setGeneratedCode(mockGeneratedCode);
      setGenerationResult({
        code: mockGeneratedCode,
        language,
        qualityScore: Math.floor(Math.random() * 30) + 70, // 70-100
        suggestions: [
          'Add error handling for edge cases',
          'Consider adding TypeScript interfaces',
          'Add unit tests for this code',
          'Consider performance optimizations'
        ],
        dependencies: selectedTemplate === 'rest-api' 
          ? ['express', 'express-validator'] 
          : selectedTemplate === 'react-component' 
          ? ['react', '@types/react']
          : []
      });
      setIsGenerating(false);
    }, 2000);
  }, [selectedTemplate, language, requirements, architecture]);

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-code.${language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            AI Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        <Badge variant="outline" className="text-xs">
                          {template.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerate} 
                  disabled={!selectedTemplate || isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
                {generatedCode && (
                  <Button variant="outline" size="icon" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Requirements</label>
              <Textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe what you want to generate..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Architecture Context</label>
              <Textarea
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                placeholder="Provide architecture context or constraints..."
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Editor */}
      {generatedCode && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Code</CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'code' | 'preview')}>
                  <TabsList>
                    <TabsTrigger value="code">
                      <Code className="h-4 w-4 mr-2" />
                      Code
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previewMode === 'code' ? (
              <div className="border rounded-lg overflow-hidden">
                <Editor
                  height="500px"
                  language={language}
                  value={generatedCode}
                  onChange={(value) => setGeneratedCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14
                  }}
                />
              </div>
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                <pre className="text-sm overflow-x-auto">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quality Analysis */}
      {generationResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Code Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overall Quality</span>
                  <span className="font-semibold">{generationResult.qualityScore}/100</span>
                </div>
                <Progress value={generationResult.qualityScore} className="w-full" />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Dependencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {generationResult.dependencies.map((dep, index) => (
                      <Badge key={index} variant="secondary">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generationResult.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CodeGenerator;