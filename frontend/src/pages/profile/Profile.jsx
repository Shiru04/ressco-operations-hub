import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider
} from "@mui/material";

import {
  apiGetMyProfile,
  apiUpdateMyProfile,
  apiChangeMyPassword
} from "../../api/users.api";

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: ""
  });

  useEffect(() => {
    apiGetMyProfile()
      .then(setProfile)
      .catch(() => {
        setError("Failed to load profile");
      });
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError(null);

      await apiUpdateMyProfile({
        name: profile.name,
        email: profile.email
      });
    } catch (err) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setError(null);

      await apiChangeMyPassword(
        passwords.currentPassword,
        passwords.newPassword
      );

      setPasswords({
        currentPassword: "",
        newPassword: ""
      });
    } catch (err) {
      setError(err?.message || "Failed to change password");
    }
  };

  if (!profile) {
    return (
      <Box p={3}>
        <Typography>Loading profile…</Typography>
      </Box>
    );
  }

  return (
    <Box maxWidth={600} mx="auto" p={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            My Profile
          </Typography>

          <TextField
            fullWidth
            margin="normal"
            label="Name"
            name="name"
            value={profile.name || ""}
            onChange={handleProfileChange}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Email"
            name="email"
            value={profile.email || ""}
            onChange={handleProfileChange}
          />

          <Button
            variant="contained"
            onClick={saveProfile}
            disabled={saving}
            sx={{ mt: 2 }}
          >
            Save Changes
          </Button>

          <Divider sx={{ my: 4 }} />

          <Typography variant="subtitle1" gutterBottom>
            Change Password
          </Typography>

          <TextField
            fullWidth
            margin="normal"
            label="Current Password"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) =>
              setPasswords((prev) => ({
                ...prev,
                currentPassword: e.target.value
              }))
            }
          />

          <TextField
            fullWidth
            margin="normal"
            label="New Password"
            type="password"
            value={passwords.newPassword}
            onChange={(e) =>
              setPasswords((prev) => ({
                ...prev,
                newPassword: e.target.value
              }))
            }
          />

          <Button
            variant="outlined"
            onClick={handlePasswordChange}
            sx={{ mt: 2 }}
          >
            Update Password
          </Button>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
