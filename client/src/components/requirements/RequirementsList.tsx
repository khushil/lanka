import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Toolbar,
  Tooltip,
  Stack
} from '@mui/material';
import { 
  DataGrid, 
  GridColDef, 
  GridRowParams, 
  GridToolbar,
  GridFilterModel,
  GridSortModel,
  GridRowSelectionModel
} from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { Requirement, RequirementCategory, Priority, RequirementStatus, RequirementFilter, RequirementSort, RequirementsListProps } from '../../types/requirements';

const RequirementsList: React.FC<RequirementsListProps> = ({
  requirements,
  loading,
  onEdit,
  onDelete,
  onView,
  filter,
  onFilterChange,
  sort,
  onSortChange
}) => {
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilter, setLocalFilter] = useState<RequirementFilter>(filter);

  const handleFilterChange = useCallback((field: keyof RequirementFilter, value: any) => {
    const newFilter = { ...localFilter, [field]: value };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  }, [localFilter, onFilterChange]);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return 'error';
      case Priority.HIGH:
        return 'warning';
      case Priority.MEDIUM:
        return 'info';
      case Priority.LOW:
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: RequirementStatus) => {
    switch (status) {
      case RequirementStatus.DRAFT:
        return 'default';
      case RequirementStatus.REVIEW:
        return 'warning';
      case RequirementStatus.APPROVED:
        return 'info';
      case RequirementStatus.IMPLEMENTED:
        return 'success';
      case RequirementStatus.REJECTED:
        return 'error';
      case RequirementStatus.DEPRECATED:
        return 'secondary';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = useMemo(() => [
    {
      field: 'title',
      headerName: 'Title',
      width: 300,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {params.row.description}
          </Typography>
        </Box>
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value.replace('_', ' ')} 
          size="small" 
          variant="outlined"
        />
      )
    },
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value.toUpperCase()} 
          size="small" 
          color={getPriorityColor(params.value)}
        />
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value.replace('_', ' ')} 
          size="small" 
          color={getStatusColor(params.value)}
        />
      )
    },
    {
      field: 'stakeholders',
      headerName: 'Stakeholders',
      width: 200,
      renderCell: (params) => (
        <Box>
          {params.value.slice(0, 2).map((stakeholder: string, index: number) => (
            <Chip 
              key={index}
              label={stakeholder} 
              size="small" 
              variant="outlined"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {params.value.length > 2 && (
            <Chip 
              label={`+${params.value.length - 2}`} 
              size="small" 
              variant="outlined"
            />
          )}
        </Box>
      )
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString()
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton size="small" onClick={() => onView(params.row)}>
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(params.row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ], [onView, onEdit, onDelete]);

  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      if (localFilter.search && !req.title.toLowerCase().includes(localFilter.search.toLowerCase()) &&
          !req.description.toLowerCase().includes(localFilter.search.toLowerCase())) {
        return false;
      }
      if (localFilter.category && localFilter.category.length > 0 && 
          !localFilter.category.includes(req.category)) {
        return false;
      }
      if (localFilter.priority && localFilter.priority.length > 0 && 
          !localFilter.priority.includes(req.priority)) {
        return false;
      }
      if (localFilter.status && localFilter.status.length > 0 && 
          !localFilter.status.includes(req.status)) {
        return false;
      }
      return true;
    });
  }, [requirements, localFilter]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Toolbar 
        sx={{ 
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Requirements</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
          >
            New Requirement
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            size="small"
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="small"
          >
            Export
          </Button>
        </Box>
      </Toolbar>

      {/* Filters */}
      {showFilters && (
        <Paper sx={{ p: 2, m: 1 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              label="Search"
              size="small"
              value={localFilter.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                multiple
                value={localFilter.category || []}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                input={<OutlinedInput label="Category" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as RequirementCategory[]).map((value) => (
                      <Chip key={value} label={value.replace('_', ' ')} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(RequirementCategory).map((category) => (
                  <MenuItem key={category} value={category}>
                    {category.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Priority</InputLabel>
              <Select
                multiple
                value={localFilter.priority || []}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                input={<OutlinedInput label="Priority" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as Priority[]).map((value) => (
                      <Chip key={value} label={value.toUpperCase()} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(Priority).map((priority) => (
                  <MenuItem key={priority} value={priority}>
                    {priority.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                multiple
                value={localFilter.status || []}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                input={<OutlinedInput label="Status" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as RequirementStatus[]).map((value) => (
                      <Chip key={value} label={value.replace('_', ' ')} size="small" />
                    ))}
                  </Box>
                )}
              >
                {Object.values(RequirementStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Paper>
      )}

      {/* Data Grid */}
      <Box sx={{ flex: 1, p: 1 }}>
        <DataGrid
          rows={filteredRequirements}
          columns={columns}
          loading={loading}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={setSelectedRows}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } }
          }}
          slots={{
            toolbar: GridToolbar
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 }
            }
          }}
          sx={{
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'action.hover'
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default RequirementsList;