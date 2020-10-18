import React from 'react';
import logo from './logo.svg';
import './App.css';
import D3Dag from './D3Dag';

const nodes = [
  {id: '10', displayName: '10'},
  {id: '20', displayName: '20'},
  {id: '30', displayName: '30'},
  {id: '40', displayName: '40'},
  {id: '50', displayName: '50'},
  {id: '60', displayName: '60'},
]

const edges = [
  {sourceId: '10', targetId: '20'},
  {sourceId: '10', targetId: '30'},
  {sourceId: '30', targetId: '40'},
  {sourceId: '30', targetId: '50'},
  {sourceId: '10', targetId: '60'},
  {sourceId: '30', targetId: '60'},
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
