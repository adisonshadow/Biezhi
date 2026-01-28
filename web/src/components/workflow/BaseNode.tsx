import React from 'react';
import { cn } from '../../utils/cn';

interface BaseNodeProps {
  children: React.ReactNode;
  className?: string;
  selected?: boolean;
  style?: React.CSSProperties;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ children, className, selected, style }) => {
  return (
    <div
      className={cn('base-node', className)}
      style={{
        background: 'rgb(35 35 35)',
        borderRadius: 8,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        border: selected ? '2px solid #1890ff' : '2px solid rgba(119, 119, 119, 0)',
        minWidth: 200,
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface BaseNodeHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const BaseNodeHeader: React.FC<BaseNodeHeaderProps> = ({ children, className, style }) => {
  return (
    <div
      className={cn('base-node-header', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solidrgba(240, 240, 240, 0.2)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface BaseNodeHeaderTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const BaseNodeHeaderTitle: React.FC<BaseNodeHeaderTitleProps> = ({ children, className, style }) => {
  return (
    <div
      className={cn('base-node-header-title', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface BaseNodeContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const BaseNodeContent: React.FC<BaseNodeContentProps> = ({ children, className, style }) => {
  return (
    <div
      className={cn('base-node-content', className)}
      style={{
        padding: '8px',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface BaseNodeFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const BaseNodeFooter: React.FC<BaseNodeFooterProps> = ({ children, className, style }) => {
  return (
    <div
      className={cn('base-node-footer', className)}
      style={{
        padding: '8px',
        borderTop: '1px solidrgba(240, 240, 240, 0)',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

