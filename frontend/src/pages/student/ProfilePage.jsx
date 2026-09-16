import React, { useState, useEffect } from 'react';
import { User, Save, CheckCircle, School, Mail, Hash, Phone, Globe, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../api/user.api';
import { Skeleton } from '../../components/common/Skeleton';
import { Badge } from '../../components/common/Badge';

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    college: '',
    bio: '',
    department: '',
    yearOfStudy: '',
    skills: '',
    github: '',
    linkedin: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        username: user.username || '',
        phone: user.phone || '',
        college: typeof user.college === 'object' ? user.college?.name || '' : user.college || '',
        bio: user.bio || '',
        department: user.department || '',
        yearOfStudy: user.yearOfStudy || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || '',
        github: user.socialLinks?.github || '',
        linkedin: user.socialLinks?.linkedin || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name.trim(),
      username: formData.username.trim(),
      phone: formData.phone.trim(),
      college: formData.college.trim(),
      bio: formData.bio.trim(),
      department: formData.department.trim(),
      yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy, 10) : undefined,
      skills: formData.skills ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      socialLinks: {
        github: formData.github.trim(),
        linkedin: formData.linkedin.trim(),
      },
    };

    try {
      await userApi.updateProfile(payload);
      await refreshUser();
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Student Profile</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Manage your university identity, background, and contact details
        </p>
      </div>

      <div className="card">
        {/* Profile Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            paddingBottom: 24,
            marginBottom: 24,
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.75rem',
            }}
          >
            {user?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{user?.name || 'Student'}</h3>
              <Badge variant="emerald">{user?.role || 'STUDENT'}</Badge>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Email: <strong>{user?.email}</strong>
            </div>
            {user?.college && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                College: <strong>{typeof user.college === 'object' ? user.college.name : user.college}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Username
              </label>
              <input
                type="text"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                type="tel"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                College / Institution
              </label>
              <input
                type="text"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="e.g. KL University"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Department / Major
              </label>
              <input
                type="text"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="e.g. Environmental Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                Year of Study
              </label>
              <input
                type="number"
                min="1"
                max="6"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="e.g. 3"
                value={formData.yearOfStudy}
                onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Bio / Background
            </label>
            <textarea
              rows={3}
              className="search-input"
              style={{
                borderRadius: 'var(--radius-md)',
                padding: 12,
                height: 'auto',
                resize: 'vertical',
              }}
              placeholder="Tell others about your sustainability passions, campus initiatives..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Skills & Interests (comma-separated)
            </label>
            <input
              type="text"
              className="search-input"
              style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
              placeholder="e.g. Solar Energy, Composting, IoT, Data Analysis"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 26 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                GitHub Profile
              </label>
              <input
                type="url"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="https://github.com/..."
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
                LinkedIn Profile
              </label>
              <input
                type="url"
                className="search-input"
                style={{ borderRadius: 'var(--radius-md)', padding: '0 12px' }}
                placeholder="https://linkedin.com/in/..."
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ width: '100%', padding: '12px 0' }}
          >
            <Save size={16} /> {saving ? 'Saving changes...' : 'Save Profile Details'}
          </button>
        </form>
      </div>
    </div>
  );
};
