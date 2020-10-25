import React from 'react';
import logo from './logo.svg';
import './App.css';
import D3Dag from './D3Dag';

const nodes = [
  {id: '10', displayName: 'ten'},
  {id: '20', displayName: 'twenty'},
  {id: '30', displayName: 'thirty'},
  {id: '40', displayName: 'forth'},
  {id: '50', displayName: 'fifty'},
  {id: '65', displayName: 'sixty five'},
]

const edges = [
  {sourceId: '10', targetId: '20'},
  {sourceId: '10', targetId: '30'},
  {sourceId: '30', targetId: '40'},
  {sourceId: '30', targetId: '50'},
  {sourceId: '10', targetId: '65'},
  {sourceId: '30', targetId: '65'},
]


function App() {
  return (
    <div className="App">
      <D3Dag 
        height={900}
        width={500}
        nodes={nodes}
        edges={edges}
      />
      
    </div>
  );
}

export default App;
