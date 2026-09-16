import React, { useState, useRef } from 'react';
import { Upload, Camera, Image, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';

export const FileUploader = ({
  file,
  onFileSelect,
  onFileRemove,
  maxSizeMB = 10,
  accept = 'image/*,application/pdf',
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFiles = (selectedFile) => {
    setValidationError(null);
    if (!selectedFile) return;

    // Validate size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setValidationError(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum ${maxSizeMB}MB.`);
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* Hidden standard file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files?.[0])}
      />
      {/* Native Camera input on Mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files?.[0])}
      />

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-light)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: dragActive ? 'var(--primary-light)' : 'var(--bg-app)',
            transition: 'var(--transition)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'white',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Upload size={22} />
          </div>

          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
            Drag and drop evidence here, or choose an option
          </p>
          <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            PNG, JPEG, PDF up to {maxSizeMB}MB
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {/* Camera capture trigger */}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => cameraInputRef.current?.click()}
              style={{ gap: 6 }}
            >
              <Camera size={14} color="var(--primary)" /> Take Photo
            </button>

            {/* Gallery / File picker */}
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ gap: 6 }}
            >
              <Image size={14} /> Choose File
            </button>
          </div>
        </div>
      ) : (
        /* Selected File Preview Box */
        <div
          style={{
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {file.type.startsWith('image/') ? <Image size={20} /> : <FileText size={20} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {file.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formatBytes(file.size)} • Ready for upload
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onFileRemove}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--danger)',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Remove file"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {validationError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            fontSize: '0.8rem',
            color: 'var(--danger)',
          }}
        >
          <AlertCircle size={14} /> {validationError}
        </div>
      )}
    </div>
  );
};
