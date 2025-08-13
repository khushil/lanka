import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Autocomplete,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { 
  Requirement, 
  RequirementCategory, 
  Priority, 
  RequirementStatus, 
  BusinessValue, 
  Effort, 
  Risk,
  RequirementFormData 
} from '../../types/requirements';

// Rich text editor would typically be a separate component
// For now, using a textarea with enhanced styling
const RichTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
}> = ({ value, onChange, label, placeholder, error, helperText }) => {
  return (
    <TextField
      label={label}
      multiline
      rows={6}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      fullWidth
      sx={{
        '& .MuiInputBase-root': {
          fontFamily: 'monospace',
          fontSize: '0.875rem'
        }
      }}
    />
  );
};

const validationSchema = yup.object({
  title: yup.string()
    .required('Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: yup.string()
    .required('Description is required')
    .min(20, 'Description must be at least 20 characters'),
  category: yup.string()
    .required('Category is required')
    .oneOf(Object.values(RequirementCategory)),
  priority: yup.string()
    .required('Priority is required')
    .oneOf(Object.values(Priority)),
  stakeholders: yup.array()
    .min(1, 'At least one stakeholder must be assigned'),
  tags: yup.array()
    .max(10, 'Maximum 10 tags allowed')
});

interface RequirementFormProps {
  requirement?: Requirement;
  onSave: (data: RequirementFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  availableStakeholders: string[];
  availableRequirements: Requirement[];
  mode: 'create' | 'edit';
}

const RequirementForm: React.FC<RequirementFormProps> = ({
  requirement,
  onSave,
  onCancel,
  loading = false,
  availableStakeholders,
  availableRequirements,
  mode
}) => {
  const [previewMode, setPreviewMode] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const formik = useFormik<RequirementFormData>({
    initialValues: {
      title: requirement?.title || '',
      description: requirement?.description || '',
      category: requirement?.category || RequirementCategory.FUNCTIONAL,
      priority: requirement?.priority || Priority.MEDIUM,
      stakeholders: requirement?.stakeholders || [],
      relatedRequirements: requirement?.relatedRequirements || [],
      tags: requirement?.tags || [],
      businessValue: requirement?.businessValue,
      effort: requirement?.effort,
      risk: requirement?.risk
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        setSubmitError('');
        await onSave(values);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to save requirement');
      }
    }
  });

  const availableTags = [
    'API', 'UI/UX', 'Database', 'Security', 'Performance', 'Mobile',
    'Integration', 'Analytics', 'Reporting', 'Authentication', 'Authorization',
    'Notification', 'Search', 'Export', 'Import', 'Workflow', 'Automation'
  ];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            {mode === 'create' ? 'Create New Requirement' : 'Edit Requirement'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
        </Box>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          {!previewMode ? (
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="title"
                  label="Title"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title}
                  fullWidth
                  placeholder="Enter a clear, concise title for the requirement"
                />
              </Grid>

              <Grid item xs={12}>
                <RichTextEditor
                  value={formik.values.description}
                  onChange={(value) => formik.setFieldValue('description', value)}
                  label="Description"
                  placeholder="Provide a detailed description of the requirement..."
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>

              {/* Classification */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Classification
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formik.values.category}
                    onChange={formik.handleChange}
                    label="Category"
                    error={formik.touched.category && Boolean(formik.errors.category)}
                  >
                    {Object.values(RequirementCategory).map((category) => (
                      <MenuItem key={category} value={category}>
                        {category.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    name="priority"
                    value={formik.values.priority}
                    onChange={formik.handleChange}
                    label="Priority"
                    error={formik.touched.priority && Boolean(formik.errors.priority)}
                  >
                    {Object.values(Priority).map((priority) => (
                      <MenuItem key={priority} value={priority}>
                        {priority.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Autocomplete
                  multiple
                  options={availableTags}
                  value={formik.values.tags}
                  onChange={(_, newValue) => formik.setFieldValue('tags', newValue)}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Add tags..."
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                />
              </Grid>

              {/* Estimation */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Estimation & Risk
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Business Value</InputLabel>
                  <Select
                    name="businessValue"
                    value={formik.values.businessValue || ''}
                    onChange={formik.handleChange}
                    label="Business Value"
                  >
                    <MenuItem value="">Not Set</MenuItem>
                    {Object.values(BusinessValue).map((value) => (
                      <MenuItem key={value} value={value}>
                        {value.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Effort</InputLabel>
                  <Select
                    name="effort"
                    value={formik.values.effort || ''}
                    onChange={formik.handleChange}
                    label="Effort"
                  >
                    <MenuItem value="">Not Set</MenuItem>
                    {Object.values(Effort).map((effort) => (
                      <MenuItem key={effort} value={effort}>
                        {effort.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Risk</InputLabel>
                  <Select
                    name="risk"
                    value={formik.values.risk || ''}
                    onChange={formik.handleChange}
                    label="Risk"
                  >
                    <MenuItem value="">Not Set</MenuItem>
                    {Object.values(Risk).map((risk) => (
                      <MenuItem key={risk} value={risk}>
                        {risk.replace('_', ' ').toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Relationships */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Relationships
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={availableStakeholders}
                  value={formik.values.stakeholders}
                  onChange={(_, newValue) => formik.setFieldValue('stakeholders', newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Stakeholders"
                      placeholder="Assign stakeholders..."
                      error={formik.touched.stakeholders && Boolean(formik.errors.stakeholders)}
                      helperText={formik.touched.stakeholders && formik.errors.stakeholders}
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option}
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ))
                  }
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={availableRequirements}
                  getOptionLabel={(option) => option.title}
                  value={availableRequirements.filter(req => 
                    formik.values.relatedRequirements.includes(req.id)
                  )}
                  onChange={(_, newValue) => 
                    formik.setFieldValue('relatedRequirements', newValue.map(req => req.id))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Related Requirements"
                      placeholder="Link related requirements..."
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.title}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                    disabled={loading || !formik.isValid}
                  >
                    {loading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Update')}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          ) : (
            // Preview Mode
            <Box>
              <Typography variant="h4" gutterBottom>
                {formik.values.title}
              </Typography>
              
              <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={formik.values.category.replace('_', ' ')} />
                <Chip label={formik.values.priority.toUpperCase()} color="primary" />
                {formik.values.businessValue && (
                  <Chip label={`Value: ${formik.values.businessValue.replace('_', ' ')}`} variant="outlined" />
                )}
                {formik.values.effort && (
                  <Chip label={`Effort: ${formik.values.effort.toUpperCase()}`} variant="outlined" />
                )}
                {formik.values.risk && (
                  <Chip label={`Risk: ${formik.values.risk.replace('_', ' ')}`} variant="outlined" />
                )}
              </Box>

              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                  {formik.values.description}
                </Typography>
              </Paper>

              {formik.values.stakeholders.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Stakeholders
                  </Typography>
                  <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {formik.values.stakeholders.map((stakeholder) => (
                      <Chip key={stakeholder} label={stakeholder} variant="outlined" />
                    ))}
                  </Box>
                </>
              )}

              {formik.values.tags.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {formik.values.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </form>
      </Paper>
    </Box>
  );
};

export default RequirementForm;