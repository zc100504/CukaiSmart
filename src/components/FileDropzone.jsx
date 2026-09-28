import { useEffect, useRef, useState } from 'react';
import { FolderOpen, UploadCloud } from 'lucide-react';
import Button from './Button.jsx';

/**
 * Drag-and-drop area with a "Browse files" button. Validation is up to the parent:
 * onFiles receives every dropped/selected File.
 * children: extra actions shown next to Browse (e.g. a sample-file button).
 */
export default function FileDropzone({ onFiles, accept, hint, children, footer }) {
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [over, setOver] = useState(false);

  // A file dropped just outside the zone would otherwise open in the browser tab.
  useEffect(() => {
    const block = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', block);
    window.addEventListener('drop', block);
    return () => {
      window.removeEventListener('dragover', block);
      window.removeEventListener('drop', block);
    };
  }, []);

  const onDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setOver(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setOver(false);
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) onFiles(files);
  };

  const onChange = (e) => {
    const files = [...(e.target.files || [])];
    // Reset so selecting the same file again still fires onChange.
    e.target.value = '';
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`dropzone ${over ? 'dropzone--over' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className="dropzone__icon" aria-hidden="true">
        <UploadCloud size={24} />
      </span>
      <p className="text-h3">{over ? 'Drop to add files' : 'Drag and drop files here'}</p>
      {hint && <p className="text-caption">{hint}</p>}
      <div className="row dropzone__actions">
        <Button variant="secondary" icon={FolderOpen} onClick={() => inputRef.current?.click()}>
          Browse files
        </Button>
        {children}
      </div>
      {footer}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
