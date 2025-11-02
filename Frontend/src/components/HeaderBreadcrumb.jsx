import React from "react";
import "./HeaderBreadcrumb.css";

const HeaderBreadcrumb = ({ title, subtitle }) => {
  return (
    <div className="header-breadcrumb">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
};

export default HeaderBreadcrumb;
