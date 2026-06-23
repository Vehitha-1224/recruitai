import React from 'react';
import './Pipelines.css';

export default function Pipeline({ columns = [] }) {
  // Minimal placeholder: render columns with simple lists
  return (
    <div className="pipeline">
      {columns.length === 0 ? (
        <div className="pipeline__empty">No pipeline data</div>
      ) : (
        columns.map((col, idx) => (
          <div className="pipeline__column" key={idx}>
            <div className="pipeline__col-header">
              <span className="pipeline__col-label">{col.title}</span>
              <span className="pipeline__col-count">{(col.items || []).length}</span>
            </div>
            <div className="pipeline__cards">
              {(col.items || []).map((item, i) => (
                <div className="pipeline__card" key={i}>
                  <div className="pipeline__card-top">
                    <div className="pipeline__card-name">{item.name}</div>
                    <div className="pipeline__card-job">{item.job_title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
