import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Code, 
  TestTube, 
  Search, 
  Cloud, 
  BarChart3, 
  Sparkles,
  Play,
  Download,
  Settings
} from 'lucide-react';

// Import development components
import CodeGenerator from '@/components/development/CodeGenerator';
import TestGenerator from '@/components/development/TestGenerator';
import CodeAnalyzer from '@/components/development/CodeAnalyzer';
import DevOpsPanel from '@/components/development/DevOpsPanel';
import ProductionFeedback from '@/components/development/ProductionFeedback';

const Development: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('code-generator');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const developmentTools = [
    {
      id: 'code-generator',
      name: 'Code Generator',
      icon: <Code className="h-5 w-5" />,
      description: 'AI-powered code generation from requirements',
      features: ['Template Selection', 'Multi-language Support', 'Quality Scoring', 'Real-time Preview'],
      component: CodeGenerator
    },
    {
      id: 'test-generator',
      name: 'Test Generator',
      icon: <TestTube className="h-5 w-5" />,
      description: 'Intelligent test suite generation and analysis',
      features: ['Unit/Integration Tests', 'Coverage Analysis', 'Mutation Testing', 'Test Prioritization'],
      component: TestGenerator
    },
    {
      id: 'code-analyzer',
      name: 'Code Analyzer',
      icon: <Search className="h-5 w-5" />,
      description: 'Comprehensive code intelligence and quality analysis',
      features: ['Bug Detection', 'Performance Analysis', 'Security Scanning', 'Refactoring Suggestions'],
      component: CodeAnalyzer
    },
    {
      id: 'devops-panel',
      name: 'DevOps Panel',
      icon: <Cloud className="h-5 w-5" />,
      description: 'DevOps automation and infrastructure management',
      features: ['CI/CD Pipelines', 'Deployment Automation', 'Infrastructure as Code', 'Monitoring Setup'],
      component: DevOpsPanel
    },
    {
      id: 'production-feedback',
      name: 'Production Insights',
      icon: <BarChart3 className="h-5 w-5" />,
      description: 'Real-time production monitoring and analytics',
      features: ['Error Tracking', 'Performance Metrics', 'User Analytics', 'Improvement Suggestions'],
      component: ProductionFeedback
    }
  ];

  const activeToolConfig = developmentTools.find(tool => tool.id === activeTab);
  const ActiveComponent = activeToolConfig?.component;

  const handleExportConfiguration = () => {
    const config = {
      activeTab,
      timestamp: new Date().toISOString(),
      tools: developmentTools.map(tool => ({
        id: tool.id,
        name: tool.name,
        features: tool.features
      }))
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'development-studio-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunAllAnalysis = async () => {
    setIsLoading(true);
    // Simulate running comprehensive analysis
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Development Intelligence Studio
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Comprehensive AI-powered development tools for modern software engineering
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRunAllAnalysis}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                {isLoading ? 'Running...' : 'Run Analysis'}
              </Button>
              <Button variant="outline" onClick={handleExportConfiguration}>
                <Download className="h-4 w-4 mr-2" />
                Export Config
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tool Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {developmentTools.map((tool) => (
              <Card 
                key={tool.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  activeTab === tool.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'hover:border-blue-300'
                }`}
                onClick={() => setActiveTab(tool.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${
                      activeTab === tool.id 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {tool.icon}
                    </div>
                    <span className="font-semibold text-sm">{tool.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {tool.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tool.features.slice(0, 2).map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {tool.features.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{tool.features.length - 2}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-2xl border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
                {developmentTools.map((tool) => (
                  <TabsTrigger
                    key={tool.id}
                    value={tool.id}
                    className="flex items-center gap-2 px-4 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
                  >
                    {tool.icon}
                    {tool.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Content */}
              {developmentTools.map((tool) => (
                <TabsContent key={tool.id} value={tool.id} className="p-6 mt-0">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        {tool.icon}
                        {tool.name}
                      </h2>
                      <div className="flex gap-1">
                        {tool.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      {tool.description}
                    </p>
                  </div>
                  
                  {ActiveComponent && <ActiveComponent />}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by LANKA Development Intelligence • Built with AI-first principles
          </p>
        </div>
      </div>
    </div>
  );
};

export default Development;