// src/app/auth/components/DividerText.tsx

import React from "react";
export default function DividerText({ children }:{ children: React.ReactNode }){
  return <div className="divider"><span></span><span>{children}</span><span></span></div>;
}
