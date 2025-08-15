import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface HeatmapChartProps {
  data: number[][];
  labels: string[];
  title?: string;
  colorScheme?: 'blues' | 'reds' | 'greens' | 'viridis' | 'plasma';
  width?: number;
  height?: number;
  showValues?: boolean;
  onCellClick?: (row: number, col: number, value: number) => void;
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  labels,
  title = 'Heatmap',
  colorScheme = 'blues',
  width = 600,
  height = 600,
  showValues = false,
  onCellClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{row: number, col: number, value: number} | null>(null);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);

  const margin = { top: 80, right: 100, bottom: 80, left: 100 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const colorSchemes = {
    blues: d3.interpolateBlues,
    reds: d3.interpolateReds,
    greens: d3.interpolateGreens,
    viridis: d3.interpolateViridis,
    plasma: d3.interpolatePlasma
  };

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Calculate cell dimensions
    const cellWidth = chartWidth / data[0].length;
    const cellHeight = chartHeight / data.length;

    // Create scales
    const xScale = d3.scaleBand()
      .domain(d3.range(data[0].length).map(String))
      .range([0, chartWidth])
      .padding(0.02);

    const yScale = d3.scaleBand()
      .domain(d3.range(data.length).map(String))
      .range([0, chartHeight])
      .padding(0.02);

    // Find min and max values for color scale
    const flatData = data.flat();
    const minValue = d3.min(flatData) || 0;
    const maxValue = d3.max(flatData) || 1;

    const colorScale = d3.scaleSequential(colorSchemes[colorScheme])
      .domain([minValue, maxValue]);

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title
    if (title) {
      svg.append('text')
        .attr('class', 'heatmap-title')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '18px')
        .style('font-weight', 'bold')
        .style('fill', '#1f2937')
        .text(title);
    }

    // Create cells
    const cells = g.selectAll('.cell')
      .data(data.flatMap((row, i) => 
        row.map((value, j) => ({ row: i, col: j, value }))
      ))
      .enter().append('g')
      .attr('class', 'cell');

    // Add cell rectangles
    cells.append('rect')
      .attr('x', d => xScale(d.col.toString())!)
      .attr('y', d => yScale(d.row.toString())!)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .transition()
      .delay((d, i) => i * 5)
      .duration(300)
      .style('opacity', 1);

    // Add cell values if enabled
    if (showValues) {
      cells.append('text')
        .attr('x', d => xScale(d.col.toString())! + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.row.toString())! + yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', Math.min(cellWidth, cellHeight) / 4)
        .style('font-weight', '500')
        .style('fill', d => d.value > (minValue + maxValue) / 2 ? '#ffffff' : '#000000')
        .style('pointer-events', 'none')
        .text(d => d.value.toFixed(2));
    }

    // Add interaction handlers
    cells
      .on('mouseover', function(event, d) {
        setHoveredCell(d);
        
        // Highlight row and column
        g.selectAll('.cell rect')
          .style('opacity', cell => 
            (cell as any).row === d.row || (cell as any).col === d.col ? 1 : 0.3
          );

        // Create tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'heatmap-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000');

        tooltip.transition()
          .duration(200)
          .style('opacity', 1);

        tooltip.html(`
          <strong>${labels[d.row]} → ${labels[d.col]}</strong><br/>
          Value: ${d.value.toFixed(3)}<br/>
          Row: ${d.row + 1}, Col: ${d.col + 1}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        setHoveredCell(null);
        
        // Reset opacity
        g.selectAll('.cell rect').style('opacity', 1);
        
        // Remove tooltip
        d3.selectAll('.heatmap-tooltip').remove();
      })
      .on('click', function(event, d) {
        setSelectedCell({ row: d.row, col: d.col });
        onCellClick?.(d.row, d.col, d.value);
      });

    // Add row labels
    g.selectAll('.row-label')
      .data(labels)
      .enter().append('text')
      .attr('class', 'row-label')
      .attr('x', -10)
      .attr('y', (d, i) => yScale(i.toString())! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px')
      .style('fill', '#374151')
      .text(d => d.length > 15 ? d.substring(0, 15) + '...' : d);

    // Add column labels
    g.selectAll('.col-label')
      .data(labels)
      .enter().append('text')
      .attr('class', 'col-label')
      .attr('x', (d, i) => xScale(i.toString())! + xScale.bandwidth() / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'baseline')
      .style('font-size', '11px')
      .style('fill', '#374151')
      .attr('transform', (d, i) => 
        `rotate(-45, ${xScale(i.toString())! + xScale.bandwidth() / 2}, -10)`
      )
      .text(d => d.length > 15 ? d.substring(0, 15) + '...' : d);

    // Add color legend
    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = chartWidth + 20;
    const legendY = (chartHeight - legendHeight) / 2;

    const legendScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.2f'));

    // Create gradient for legend
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', legendHeight)
      .attr('x2', 0).attr('y2', 0);

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = minValue + t * (maxValue - minValue);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    // Add legend rectangle
    g.append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)')
      .style('stroke', '#d1d5db')
      .style('stroke-width', 1);

    // Add legend axis
    g.append('g')
      .attr('class', 'legend-axis')
      .attr('transform', `translate(${legendX + legendWidth}, ${legendY})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', '#374151');

    // Add legend title
    g.append('text')
      .attr('class', 'legend-title')
      .attr('x', legendX + legendWidth / 2)
      .attr('y', legendY - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#1f2937')
      .text('Similarity');

  }, [data, labels, colorScheme, width, height, showValues]);

  // Highlight selected cell
  useEffect(() => {
    if (!svgRef.current || !selectedCell) return;

    const svg = d3.select(svgRef.current);
    
    svg.selectAll('.cell rect')
      .style('stroke', (d: any) => 
        d.row === selectedCell.row && d.col === selectedCell.col ? '#fbbf24' : '#ffffff'
      )
      .style('stroke-width', (d: any) => 
        d.row === selectedCell.row && d.col === selectedCell.col ? 3 : 1
      );
  }, [selectedCell]);

  const handleExport = () => {
    if (!svgRef.current) return;

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_heatmap.svg`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="heatmap-chart">
      <div className="heatmap-controls">
        <motion.button
          className="control-btn"
          onClick={handleExport}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          💾 Export SVG
        </motion.button>

        <div className="color-scheme-selector">
          <label>Color Scheme:</label>
          <select 
            value={colorScheme} 
            onChange={(e) => {
              // This would need to be passed as a prop or handled by parent
              console.log('Color scheme changed:', e.target.value);
            }}
          >
            <option value="blues">Blues</option>
            <option value="reds">Reds</option>
            <option value="greens">Greens</option>
            <option value="viridis">Viridis</option>
            <option value="plasma">Plasma</option>
          </select>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="heatmap-svg"
      />

      {hoveredCell && (
        <motion.div
          className="heatmap-info"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <h4>Cell Information</h4>
          <div className="info-item">
            <span>Row:</span> {labels[hoveredCell.row]}
          </div>
          <div className="info-item">
            <span>Column:</span> {labels[hoveredCell.col]}
          </div>
          <div className="info-item">
            <span>Value:</span> {hoveredCell.value.toFixed(3)}
          </div>
        </motion.div>
      )}

      {data.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No data available</h3>
          <p>Check your data source and try again</p>
        </div>
      )}
    </div>
  );
};

export default HeatmapChart;