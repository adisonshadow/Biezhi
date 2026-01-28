import React from 'react';
import { cn } from '../../utils/cn';

type Status = 'success' | 'loading' | 'error' | 'initial';
type LoadingVariant = 'border' | 'overlay';

interface NodeStatusIndicatorProps {
  children: React.ReactNode;
  status: Status;
  variant?: LoadingVariant;
  className?: string;
}

export const NodeStatusIndicator: React.FC<NodeStatusIndicatorProps> = ({
  children,
  status,
  variant = 'border',
  className,
}) => {
  const isSuccess = status === 'success';
  const isLoading = status === 'loading';
  const isError = status === 'error';

  return (
    <div className={cn('relative', className)} style={{ position: 'relative' }}>

      {/* Success indicator */}
      {isSuccess && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 11,
            border: '2px solid #52c41a',
            animation: 'fadeIn 0.2s ease-in-out',
            zIndex: -1,
          }}
        />
      )}

      {/* Error indicator */}
      {isError && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 11,
            border: '2px solid #ff4d4f',
            animation: 'fadeIn 0.2s ease-in-out',
            zIndex: -1,
          }}
        />
      )}

      {/* Loading indicator - border variant */}
      {isLoading && variant === 'border' && (
        <div
          className="node-status-loading-border-wrapper absolute pointer-events-none"
          style={{
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 11,
            zIndex: -1,
            overflow: 'hidden',
          }}
        >
          <div
            className="node-status-loading-border-bg"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 11,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '4px',
              borderRadius: 9,
              background: '#fff',
              zIndex: -1,
            }}
          />
        </div>
      )}

      {/* Loading indicator - overlay variant */}
      {isLoading && variant === 'overlay' && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: '3px solid #f0f0f0',
              borderTopColor: '#1890ff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

<style>{`
        .node-status-loading-border-bg {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 120deg,
            #1890ff 150deg,
            #69b1ff 180deg,
            #1890ff 210deg,
            transparent 240deg,
            transparent 360deg
          );
          animation: rotate-border-bg 2s linear infinite;
        }

        @keyframes rotate-border-bg {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {children}
      
    </div>
  );
};

