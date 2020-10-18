import React, { useState, useEffect } from 'react';
import * as d3 from "d3";
import { tickStep } from 'd3';

interface InputDagNode {
  id: string
  displayName: string
}

interface InputEdge {
  sourceId: string
  targetId: string
}

interface DagNode {
  id: string
  displayName: string
  layerNumber: number
  // x: number
  // y: number
}

interface Edge {
  sourceNode: DagNode
  targetNode: DagNode
}

interface D3DagProps {
  height: number
  width: number
  nodes: InputDagNode[]
  edges: InputEdge[]
}

class AdjacencyList implements Iterable<[string, string[]]> {
  nodes: InputDagNode[]
  edges: InputEdge[]
  decendents: Map<string, string[]>
  idToNode: Map<string, InputDagNode>

  constructor(nodes: InputDagNode[], edges: InputEdge[]) {
    this.nodes = nodes
    this.edges = edges
    this.decendents = new Map<string, string[]>()
    this.idToNode = new Map<string, InputDagNode>()
    this.createIdToNode()
    this.createAdjacencyList()
  }

  createIdToNode(){
    for(const node of this.nodes){
      this.idToNode.set(node.id, node)
    }
  }

  createAdjacencyList() {
    for(const e of this.edges) {
      if(!this.decendents.has(e.sourceId)){
        this.decendents.set(e.sourceId, [])
      }
      this.decendents.get(e.sourceId)?.push(e.targetId)
    }
  }

  getNodesDecendent(nodeId: string): string[] {
    const decendents = this.decendents.get(nodeId)
    return decendents ? decendents : []
  }

  [Symbol.iterator](): Iterator<[string, string[]]> {
    return this.decendents.entries()
  }

  getNodeById(nodeId: string): InputDagNode {
    const node = this.idToNode.get(nodeId)
    if(!node) throw Error(`invalid NodeId: ${nodeId}`)
    return node
  }
}


class InDegrees {
  inDegrees: Map<string, number>
  inputNodes: InputDagNode[]
  graph: AdjacencyList

  constructor(nodes: InputDagNode[], graph: AdjacencyList){
    this.inputNodes = nodes
    this.inDegrees = new Map<string, number>()
    this.graph = graph
    this.createIndegrees()
  }

  private getNodeInDegrees(nodeId: string, inDegrees: Map<string, number>): number {
    const inDegree = inDegrees.get(nodeId)
    if(inDegree != null) return inDegree
    return 0
  }

  private setNodeDegrees(nodeId: string, inDegree: number, inDegrees: Map<string, number>){
    inDegrees.set(nodeId, inDegree)
  }

  private decrementNodeDegrees(nodeId: string, inDegrees: Map<string, number>){
    const currentInDegrees = this.getNodeInDegrees(nodeId, inDegrees)
    this.setNodeDegrees(nodeId, currentInDegrees-1, inDegrees)
  }

  private createIndegrees() {
    for(const node of this.inputNodes){
      this.inDegrees.set(node.id, 0)
    }

    for(const [nodeId, neighbors] of this.graph){
      neighbors.forEach(neightborId => {
        this.setNodeDegrees(
          neightborId,
          this.getNodeInDegrees(neightborId, this.inDegrees) + 1,
          this.inDegrees
        )
      })
    }
  }

  private getNodesWithNoInDegrees(inDegrees: Map<string, number>): string[] {
    const ans = [] as string[]
    for(const [nodeId, inDegree] of inDegrees.entries()){
      if(inDegree === 0){
        this.setNodeDegrees(nodeId, -1, inDegrees)
        ans.push(nodeId)
      }
    }
    return ans
  }

  getLayers(): Map<number, InputDagNode[]> {
    const inDegreesCopy = new Map(this.inDegrees)
    const layers = new Map<number, InputDagNode[]>()

    for(let layer=0 ; layer < this.inputNodes.length ; layer++){
      console.log(`layer: ${layer}`);  
      for(const nodeId of this.getNodesWithNoInDegrees(inDegreesCopy)) {
        console.log(`nodeID: ${nodeId}`);
        const nodesInCurrentLayer = layers.get(layer) ? layers.get(layer)! : []
        layers.set(layer, [...nodesInCurrentLayer, this.graph.getNodeById(nodeId)])
        this.graph.getNodesDecendent(nodeId).forEach(decendentId => this.decrementNodeDegrees(decendentId, inDegreesCopy) )
      }
    }
    return layers
  }
}


function _topologicalSort(nodes: InputDagNode[], edges: InputEdge[]): Map<number, InputDagNode[]> {
    const adjacencyList = new AdjacencyList(nodes, edges)
    const inDegrees = new InDegrees(nodes, adjacencyList)

    
    const layers = inDegrees.getLayers()
    
    for(const [layer, nodes] of layers){
      console.log(layer)
      console.log(nodes)
      console.log("---")
    }
    return layers
}


function D3Dag({height, width, nodes, edges}: D3DagProps) {

  _topologicalSort(nodes, edges)


  const myRef = React.createRef<HTMLDivElement>();
  const graphRef = React.createRef<HTMLDivElement>();

  const [clicked, addRemoveClicked] = useState(new Set())

  function toggleClicked(id: string) {
    console.log(`in toggleClicked`);
    addRemoveClicked((prevClicked) => {
      console.log(`prev`);
      console.log(prevClicked);
      if(prevClicked.has(id)){
        prevClicked.delete(id)
        return prevClicked
      } else{
        prevClicked.add(id)
        return prevClicked
      }
    })
  }

  console.log(`here 1`);
  useEffect(() => {
    // Update the document title using the browser API
    if(myRef.current == null)
      return
    myRef.current.innerHTML = "inneerHTML"
    // myRef.innerHTML = `You clicked times`;

    console.log(`in useEffect`);
    const vis = d3.select("#graph").append("svg:svg")
    vis.attr("width", width).attr("height", height)
      .style("background-color", "pink")
    vis.text("The Graph").select("#graph")
    vis.selectAll("circle .nodes")
     .data(nodes)
     .enter()
     .append("svg:circle")
     .attr("class", "nodes")
     .attr("cx", function(d) { return Number(d.id)*2; })
     .attr("cy", function(d) { return Number(d.id)*2; })
     .attr("r", "10px")
     .style("fill", "black")
     .on("click", (element, datum) => {
       const x = datum as unknown as InputDagNode
        console.log(x)
        toggleClicked(x.id)
     })

     vis.selectAll(".line")
      .data(edges)
      .enter()
      .append("line")
      .attr("x1", function(d) { return Number(d.sourceId)*2 })
      .attr("y1", function(d) { return Number(d.sourceId)*2 })
      .attr("x2", function(d) { return Number(d.targetId)*2 })
      .attr("y2", function(d) { return Number(d.targetId)*2 })
      .style("stroke", "black");

  });

  console.log(`here 2`);

  return (
    <>
      <div ref={myRef} id="X"> "hi" </div>
      <div ref={graphRef} id="graph"></div>
    </>
  )
}

export default D3Dag;
