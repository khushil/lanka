import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Typography,
  Autocomplete,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Search,
  Clear,
  History,
  FilterList,
  ExpandMore,
  Save,
  Delete,
} from '@mui/icons-material';
import { GraphNode, GraphSearchResult } from '../../types/graph';
import { searchNodes, getNodeColor } from '../../utils/graphUtils';

interface GraphSearchProps {
  nodes: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  onHighlightNodes: (nodeIds: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

interface SearchFilter {
  type?: string;
  property?: string;
  value?: string;
  operator?: 'equals' | 'contains' | 'startswith' | 'endswith';
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilter[];
  timestamp: Date;
}

export const GraphSearch: React.FC<GraphSearchProps> = ({
  nodes,
  onNodeSelect,
  onHighlightNodes,
  searchQuery,
  onSearchChange,
  className,
}) => {
  const [searchResults, setSearchResults] = useState<GraphNode[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilter[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');

  // Load saved data from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('lanka-search-history');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }

    const savedSearchesData = localStorage.getItem('lanka-saved-searches');
    if (savedSearchesData) {
      setSavedSearches(JSON.parse(savedSearchesData).map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      })));
    }
  }, []);

  // Save search history
  const addToHistory = useCallback((query: string) => {
    if (query.trim() && !searchHistory.includes(query)) {
      const newHistory = [query, ...searchHistory.slice(0, 9)]; // Keep last 10
      setSearchHistory(newHistory);
      localStorage.setItem('lanka-search-history', JSON.stringify(newHistory));
    }
  }, [searchHistory]);

  // Perform search
  const performSearch = useCallback((query: string, filters: SearchFilter[] = []) => {
    let results = searchNodes(nodes, query);

    // Apply advanced filters
    if (filters.length > 0) {
      results = results.filter(node => {
        return filters.every(filter => {
          if (filter.type && node.type !== filter.type) return false;
          
          if (filter.property && filter.value) {
            const propertyValue = String(node.properties[filter.property] || '').toLowerCase();
            const filterValue = filter.value.toLowerCase();
            
            switch (filter.operator) {
              case 'equals':
                return propertyValue === filterValue;
              case 'contains':
                return propertyValue.includes(filterValue);
              case 'startswith':
                return propertyValue.startsWith(filterValue);
              case 'endswith':
                return propertyValue.endsWith(filterValue);
              default:
                return propertyValue.includes(filterValue);
            }
          }
          
          return true;
        });
      });
    }

    setSearchResults(results);
    onHighlightNodes(results.map(node => node.id));
    
    if (query.trim()) {
      addToHistory(query);
    }
  }, [nodes, onHighlightNodes, addToHistory]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    performSearch(value, advancedFilters);
  };

  // Handle search clear
  const handleClearSearch = () => {
    onSearchChange('');
    setSearchResults([]);
    onHighlightNodes([]);
  };

  // Handle node selection
  const handleNodeClick = (node: GraphNode) => {
    onNodeSelect(node);
  };

  // Add advanced filter
  const addAdvancedFilter = () => {
    setAdvancedFilters([...advancedFilters, { operator: 'contains' }]);
  };

  // Remove advanced filter
  const removeAdvancedFilter = (index: number) => {
    const newFilters = advancedFilters.filter((_, i) => i !== index);
    setAdvancedFilters(newFilters);
    performSearch(searchQuery, newFilters);
  };

  // Update advanced filter
  const updateAdvancedFilter = (index: number, field: keyof SearchFilter, value: string) => {
    const newFilters = [...advancedFilters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setAdvancedFilters(newFilters);
    performSearch(searchQuery, newFilters);
  };

  // Save current search
  const saveCurrentSearch = () => {
    if (saveSearchName.trim() && (searchQuery.trim() || advancedFilters.length > 0)) {
      const newSavedSearch: SavedSearch = {
        id: Date.now().toString(),
        name: saveSearchName,
        query: searchQuery,
        filters: advancedFilters,
        timestamp: new Date(),
      };
      
      const newSavedSearches = [newSavedSearch, ...savedSearches];
      setSavedSearches(newSavedSearches);
      localStorage.setItem('lanka-saved-searches', JSON.stringify(newSavedSearches));
      setSaveSearchName('');
    }
  };

  // Load saved search
  const loadSavedSearch = (savedSearch: SavedSearch) => {
    onSearchChange(savedSearch.query);
    setAdvancedFilters(savedSearch.filters);
    performSearch(savedSearch.query, savedSearch.filters);
  };

  // Delete saved search
  const deleteSavedSearch = (id: string) => {
    const newSavedSearches = savedSearches.filter(s => s.id !== id);
    setSavedSearches(newSavedSearches);
    localStorage.setItem('lanka-saved-searches', JSON.stringify(newSavedSearches));
  };

  // Get unique node types for filter dropdown
  const nodeTypes = Array.from(new Set(nodes.map(node => node.type))).sort();

  // Get unique property keys for filter dropdown
  const propertyKeys = Array.from(
    new Set(nodes.flatMap(node => Object.keys(node.properties)))
  ).sort();

  return (
    <Paper className={className} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Search />
        Graph Search
        <Badge badgeContent={searchResults.length} color="primary" sx={{ ml: 'auto' }} />
      </Typography>

      {/* Main Search Input */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search nodes by name, type, or properties..."
        value={searchQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={handleClearSearch}>
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2 }}
      />

      {/* Quick Filters */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Quick Filters</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {nodeTypes.map(type => (
            <Chip
              key={type}
              label={type}
              size="small"
              onClick={() => handleSearchChange(`type:${type}`)}
              sx={{
                backgroundColor: getNodeColor(type),
                color: 'white',
                '&:hover': {
                  backgroundColor: getNodeColor(type),
                  opacity: 0.8,
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Advanced Search */}
      <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList fontSize="small" />
            Advanced Search
            {advancedFilters.length > 0 && (
              <Badge badgeContent={advancedFilters.length} color="secondary" />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {advancedFilters.map((filter, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filter.type || ''}
                    onChange={(e) => updateAdvancedFilter(index, 'type', e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="">Any</MenuItem>
                    {nodeTypes.map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Property</InputLabel>
                  <Select
                    value={filter.property || ''}
                    onChange={(e) => updateAdvancedFilter(index, 'property', e.target.value)}
                    label="Property"
                  >
                    <MenuItem value="">Any</MenuItem>
                    {propertyKeys.map(key => (
                      <MenuItem key={key} value={key}>{key}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={filter.operator || 'contains'}
                    onChange={(e) => updateAdvancedFilter(index, 'operator', e.target.value)}
                    label="Operator"
                  >
                    <MenuItem value="contains">Contains</MenuItem>
                    <MenuItem value="equals">Equals</MenuItem>
                    <MenuItem value="startswith">Starts with</MenuItem>
                    <MenuItem value="endswith">Ends with</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="Value"
                  value={filter.value || ''}
                  onChange={(e) => updateAdvancedFilter(index, 'value', e.target.value)}
                  sx={{ flex: 1 }}
                />

                <IconButton size="small" onClick={() => removeAdvancedFilter(index)}>
                  <Delete />
                </IconButton>
              </Box>
            ))}

            <Button
              variant="outlined"
              size="small"
              onClick={addAdvancedFilter}
              startIcon={<FilterList />}
            >
              Add Filter
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Save Search */}
      {(searchQuery.trim() || advancedFilters.length > 0) && (
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Save search as..."
            value={saveSearchName}
            onChange={(e) => setSaveSearchName(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={saveCurrentSearch}
            disabled={!saveSearchName.trim()}
            startIcon={<Save />}
          >
            Save
          </Button>
        </Box>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Search Results ({searchResults.length})
          </Typography>
          <List dense>
            {searchResults.slice(0, 50).map(node => (
              <ListItem key={node.id} disablePadding>
                <ListItemButton onClick={() => handleNodeClick(node)}>
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: getNodeColor(node.type),
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={node.name}
                    secondary={`${node.type} • ${Object.keys(node.properties).length} properties`}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            {searchResults.length > 50 && (
              <ListItem>
                <ListItemText
                  primary={`... and ${searchResults.length - 50} more results`}
                  primaryTypographyProps={{ fontSize: '0.75rem', color: 'text.secondary' }}
                />
              </ListItem>
            )}
          </List>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History fontSize="small" />
            Recent Searches
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {searchHistory.slice(0, 5).map((query, index) => (
              <Chip
                key={index}
                label={query}
                size="small"
                variant="outlined"
                onClick={() => handleSearchChange(query)}
                deleteIcon={<Clear />}
                onDelete={() => {
                  const newHistory = searchHistory.filter(q => q !== query);
                  setSearchHistory(newHistory);
                  localStorage.setItem('lanka-search-history', JSON.stringify(newHistory));
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Save fontSize="small" />
            Saved Searches
          </Typography>
          <List dense>
            {savedSearches.map(savedSearch => (
              <ListItem
                key={savedSearch.id}
                secondaryAction={
                  <Tooltip title="Delete saved search">
                    <IconButton size="small" onClick={() => deleteSavedSearch(savedSearch.id)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton onClick={() => loadSavedSearch(savedSearch)}>
                  <ListItemText
                    primary={savedSearch.name}
                    secondary={`${savedSearch.query || 'Advanced filters'} • ${savedSearch.timestamp.toLocaleDateString()}`}
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
};

export default GraphSearch;