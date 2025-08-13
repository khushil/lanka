import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Avatar,
  Grid,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch
} from '@mui/material';
import {
  PhotoCamera,
  Edit,
  Save,
  Cancel,
  Email,
  Phone,
  LocationOn,
  Work,
  Person,
  Link as LinkIcon,
  Add,
  Delete,
  Verified,
  VerifiedUser
} from '@mui/icons-material';
import { UserProfile, SocialLink } from '../../types/settings';
import { useAuth } from '../../hooks/useAuth';

interface ProfileSettingsProps {
  onSave?: (profile: UserProfile) => void;
}

interface SocialLinkDialogProps {
  open: boolean;
  link?: SocialLink;
  onClose: () => void;
  onSave: (link: SocialLink) => void;
}

const SocialLinkDialog: React.FC<SocialLinkDialogProps> = ({ open, link, onClose, onSave }) => {
  const [platform, setPlatform] = useState(link?.platform || '');
  const [url, setUrl] = useState(link?.url || '');
  const [isPublic, setIsPublic] = useState(link?.isPublic || false);

  const handleSave = () => {
    if (platform.trim() && url.trim()) {
      onSave({
        platform: platform.trim(),
        url: url.trim(),
        isPublic
      });
      onClose();
    }
  };

  const handleClose = () => {
    setPlatform(link?.platform || '');
    setUrl(link?.url || '');
    setIsPublic(link?.isPublic || false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {link ? 'Edit Social Link' : 'Add Social Link'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. GitHub, LinkedIn, Twitter"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              <Typography variant="body2">
                Make this link public on your profile
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!platform.trim() || !url.trim()}>
          {link ? 'Update' : 'Add'} Link
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onSave }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
    title: '',
    department: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    phoneNumber: '',
    bio: '',
    socialLinks: [],
    isEmailVerified: true,
    isPhoneVerified: false,
    lastPasswordChange: new Date()
  });
  
  const [socialLinkDialog, setSocialLinkDialog] = useState<{
    open: boolean;
    link?: SocialLink;
    index?: number;
  }>({ open: false });
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset profile to original values
    setProfile(prev => ({ ...prev }));
  };

  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(profile);
      }
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('Failed to update profile');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you would upload the file to a server
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({ ...prev, avatar: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSocialLink = (link: SocialLink) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), link]
    }));
  };

  const handleEditSocialLink = (index: number, link: SocialLink) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks?.map((l, i) => i === index ? link : l) || []
    }));
  };

  const handleDeleteSocialLink = (index: number) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: prev.socialLinks?.filter((_, i) => i !== index) || []
    }));
  };

  const handleVerifyEmail = () => {
    // In a real app, this would send a verification email
    setSuccessMessage('Verification email sent');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleVerifyPhone = () => {
    // In a real app, this would send a verification SMS
    setSuccessMessage('Verification SMS sent');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Profile Information"
          subheader="Manage your personal information and public profile"
          action={
            <Box>
              {!isEditing ? (
                <Button startIcon={<Edit />} onClick={handleEdit}>
                  Edit Profile
                </Button>
              ) : (
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<Cancel />} onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button startIcon={<Save />} variant="contained" onClick={handleSave}>
                    Save Changes
                  </Button>
                </Stack>
              )}
            </Box>
          }
        />
        
        <CardContent>
          <Grid container spacing={3}>
            {/* Avatar Section */}
            <Grid item xs={12} sx={{ textAlign: 'center', mb: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar
                  src={profile.avatar}
                  sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </Avatar>
                {isEditing && (
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 0,
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                    onClick={handleAvatarClick}
                  >
                    <PhotoCamera />
                  </IconButton>
                )}
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </Grid>

            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                value={profile.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={profile.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!isEditing}
                  type="email"
                  required
                  InputProps={{
                    endAdornment: profile.isEmailVerified ? (
                      <Verified color="success" />
                    ) : (
                      <Tooltip title="Verify email address">
                        <IconButton onClick={handleVerifyEmail} size="small">
                          <Email />
                        </IconButton>
                      </Tooltip>
                    )
                  }}
                />
                {profile.isEmailVerified ? (
                  <Chip
                    size="small"
                    label="Verified"
                    color="success"
                    icon={<Verified />}
                    sx={{ position: 'absolute', top: -10, right: 8 }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Unverified"
                    color="warning"
                    sx={{ position: 'absolute', top: -10, right: 8 }}
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Job Title"
                value={profile.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. Senior Software Engineer"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Department"
                value={profile.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. Engineering"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                value={profile.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. San Francisco, CA"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Timezone"
                value={profile.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                disabled={!isEditing}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={profile.phoneNumber || ''}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  disabled={!isEditing}
                  type="tel"
                  InputProps={{
                    endAdornment: !profile.isPhoneVerified && profile.phoneNumber ? (
                      <Tooltip title="Verify phone number">
                        <IconButton onClick={handleVerifyPhone} size="small">
                          <Phone />
                        </IconButton>
                      </Tooltip>
                    ) : null
                  }}
                />
                {profile.phoneNumber && (
                  <Chip
                    size="small"
                    label={profile.isPhoneVerified ? "Verified" : "Unverified"}
                    color={profile.isPhoneVerified ? "success" : "warning"}
                    icon={profile.isPhoneVerified ? <Verified /> : undefined}
                    sx={{ position: 'absolute', top: -10, right: 8 }}
                  />
                )}
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Bio"
                value={profile.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!isEditing}
                placeholder="Tell us about yourself..."
                helperText={`${(profile.bio || '').length}/500 characters`}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            {/* Social Links Section */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Social Links</Typography>
                {isEditing && (
                  <Button
                    startIcon={<Add />}
                    onClick={() => setSocialLinkDialog({ open: true })}
                    variant="outlined"
                    size="small"
                  >
                    Add Link
                  </Button>
                )}
              </Box>
              
              {profile.socialLinks && profile.socialLinks.length > 0 ? (
                <List>
                  {profile.socialLinks.map((link, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <LinkIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={link.platform}
                        secondary={link.url}
                      />
                      <ListItemSecondaryAction>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={link.isPublic ? "Public" : "Private"}
                            color={link.isPublic ? "success" : "default"}
                            variant="outlined"
                          />
                          {isEditing && (
                            <>
                              <IconButton
                                size="small"
                                onClick={() => setSocialLinkDialog({ 
                                  open: true, 
                                  link, 
                                  index 
                                })}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteSocialLink(index)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </>
                          )}
                        </Stack>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No social links added yet
                </Typography>
              )}
            </Grid>

            {/* Account Status */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>Account Status</Typography>
              <Stack spacing={1}>
                <Chip
                  icon={<Verified />}
                  label={`Email ${profile.isEmailVerified ? 'Verified' : 'Not Verified'}`}
                  color={profile.isEmailVerified ? 'success' : 'warning'}
                  variant="outlined"
                />
                <Chip
                  icon={<Phone />}
                  label={`Phone ${profile.isPhoneVerified ? 'Verified' : 'Not Verified'}`}
                  color={profile.isPhoneVerified ? 'success' : 'default'}
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  Last password change: {profile.lastPasswordChange.toLocaleDateString()}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Social Link Dialog */}
      <SocialLinkDialog
        open={socialLinkDialog.open}
        link={socialLinkDialog.link}
        onClose={() => setSocialLinkDialog({ open: false })}
        onSave={(link) => {
          if (socialLinkDialog.index !== undefined) {
            handleEditSocialLink(socialLinkDialog.index, link);
          } else {
            handleAddSocialLink(link);
          }
        }}
      />
    </Box>
  );
};