import React from 'react';

export function Card({
  children,
  className = '',
  elevated = false,
}: {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return (
    <div
      className={`${
        elevated
          ? 'bg-[#141416] border border-[#202024] p-4 rounded-xl'
          : 'bg-[#0d0d0f] border border-[#26262a] p-5 rounded-2xl'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`pb-4 border-b border-[#26262a] flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`pt-4 ${className}`}>{children}</div>;
}

export function CardFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`pt-4 border-t border-[#26262a] flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}
