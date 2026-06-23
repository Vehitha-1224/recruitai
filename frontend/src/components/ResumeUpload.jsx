import React, { useState, useCallback } from 'react';

// # useDropzone gives us drag-and-drop file upload
import { useDropzone } from 'react-dropzone';

import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { candidatesAPI } from '../services/api';
import toast from 'react-hot-toast';
import './ResumeUpload.css';

// ─── PROPS ───────────────────────────────────────────────────────
// # jobId      → which job these resumes are for
// # onSuccess  → called after successful upload with candidate data
// # onClose    → called when user wants to close the upload panel
function ResumeUpload({ jobId, onSuccess, onClose }) {

  // # List of files user dropped/selected
  const [files, setFiles] = useState([]);

  // # Tracks upload status for each file
  // # { filename: 'uploading' | 'success' | 'error' }
  const [uploadStatus, setUploadStatus] = useState({});

  // # True while any file is being uploaded
  const [isUploading, setIsUploading] = useState(false);

  // ── HANDLE FILE DROP ────────────────────────────────────────
  // # useCallback prevents function recreation on every render
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {

    // # Tell user if they dropped wrong file types
    if (rejectedFiles.length > 0) {
      toast.error('Only PDF files are accepted');
      return;
    }

    // # Limit to 10 files at once
    if (acceptedFiles.length > 10) {
      toast.error('Maximum 10 files at once');
      return;
    }

    // # Add new files to existing list
    // # Filter out duplicates by filename
    setFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const newFiles = acceptedFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });

  }, []);

  // ── DROPZONE CONFIGURATION ──────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] }, // # PDFs only
    maxSize: 5 * 1024 * 1024,               // # Max 5MB per file
    multiple: true,                          // # Allow multiple files
  });

  // ── REMOVE A FILE FROM LIST ─────────────────────────────────
  const removeFile = (fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    // # Also remove its status
    setUploadStatus(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  // ── UPLOAD ALL FILES ────────────────────────────────────────
  const handleUpload = async () => {
    // # Must have files and a job selected
    if (files.length === 0) {
      toast.error('Please add at least one resume');
      return;
    }
    if (!jobId) {
      toast.error('Please select a job first');
      return;
    }

    setIsUploading(true);

    // # Track results
    let successCount = 0;
    let errorCount = 0;

    // # Upload each file one by one
    for (const file of files) {
      // # Set this file's status to uploading
      setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));

      try {
        // # Send file to backend
        const result = await candidatesAPI.uploadResume(file, jobId);

        // # Mark as success
        setUploadStatus(prev => ({ ...prev, [file.name]: 'success' }));
        successCount++;

        // # Notify parent component about new candidate
        if (onSuccess) onSuccess(result);

      } catch (error) {
        // # Mark as failed
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        errorCount++;
      }
    }

    setIsUploading(false);

    // # Show summary toast
    if (successCount > 0) {
      toast.success(`${successCount} resume(s) uploaded successfully`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} resume(s) failed to upload`);
    }
  };

  // ── FORMAT FILE SIZE ────────────────────────────────────────
  // # Convert bytes to readable format e.g. "2.4 MB"
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── STATUS ICON ─────────────────────────────────────────────
  // # Returns the right icon based on upload status
  const StatusIcon = ({ status }) => {
    if (status === 'uploading') return <Loader size={16} className="spin" />;
    if (status === 'success')   return <CheckCircle size={16} color="var(--success)" />;
    if (status === 'error')     return <AlertCircle size={16} color="var(--danger)" />;
    return null;
  };

  // ── HOW MANY FILES ARE DONE ─────────────────────────────────
  const doneCount = Object.values(uploadStatus)
    .filter(s => s === 'success' || s === 'error').length;

  return (
    <div className="resume-upload">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="resume-upload__header">
        <h3>Upload Resumes</h3>
        {onClose && (
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} /> Close
          </button>
        )}
      </div>

      {/* ── DROP ZONE ────────────────────────────────────────── */}
      <div
        {...getRootProps()}           // # Spread dropzone props onto div
        className={`resume-upload__dropzone
          ${isDragActive ? 'resume-upload__dropzone--active' : ''}
        `}
      >
        {/* # Hidden file input — dropzone manages this */}
        <input {...getInputProps()} />

        <Upload size={36} className="resume-upload__icon" />

        {isDragActive ? (
          <p className="resume-upload__text">Drop your resumes here!</p>
        ) : (
          <>
            <p className="resume-upload__text">
              Drag & drop resumes here, or click to browse
            </p>
            <p className="resume-upload__hint">
              PDF files only • Max 5MB each • Up to 10 files
            </p>
          </>
        )}
      </div>

      {/* ── FILE LIST ────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="resume-upload__files">

          {/* # Progress bar when uploading */}
          {isUploading && (
            <div className="resume-upload__progress-bar">
              <div
                className="resume-upload__progress-fill"
                style={{ width: `${(doneCount / files.length) * 100}%` }}
              />
            </div>
          )}

          {/* # List each file with its status */}
          {files.map(file => (
            <div key={file.name} className="resume-upload__file-item">

              {/* # PDF icon */}
              <File size={18} color="var(--primary)" />

              {/* # File name and size */}
              <div className="resume-upload__file-info">
                <p className="resume-upload__file-name">{file.name}</p>
                <p className="resume-upload__file-size">{formatSize(file.size)}</p>
              </div>

              {/* # Status icon or remove button */}
              <div className="resume-upload__file-action">
                {uploadStatus[file.name] ? (
                  <StatusIcon status={uploadStatus[file.name]} />
                ) : (
                  // # Remove button — hidden while uploading
                  !isUploading && (
                    <button
                      className="resume-upload__remove"
                      onClick={() => removeFile(file.name)}
                      aria-label="Remove file"
                    >
                      <X size={14} />
                    </button>
                  )
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD BUTTON ────────────────────────────────────── */}
      {files.length > 0 && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <><div className="spinner" /> Uploading...</>
          ) : (
            <><Upload size={16} /> Upload {files.length} Resume{files.length > 1 ? 's' : ''}</>
          )}
        </button>
      )}

    </div>
  );
}

export default ResumeUpload;