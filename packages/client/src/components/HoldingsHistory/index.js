import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './HoldingsHistory.css';
import { getHoldingsHistory } from '../../services/holdingsHistory';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot
} from 'recharts';

/**
 * HoldingsHistory Component
 * Props:
 *  - userId (string) required
 *  - symbol (string) optional filter for a single symbol
 */
export default function HoldingsHistory({ userId, symbol }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null); // ponto selecionado
  const [hoverPoint, setHoverPoint] = useState(null); // ponto em hover

  useEffect(() => {
    async function load() {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getHoldingsHistory(userId, symbol);
        console.log('Holdings history result:', result);
        
        if (result?.aviso) {
          setError(result.aviso);
          setData([]);
        } else {
          setData(Array.isArray(result) ? result : []);
        }
      } catch (e) {
        setError('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, symbol]);

  // Transform data for chart: use validFrom as x axis point, show quantity & avg price
  const chartData = useMemo(() => {
    return data.map((item, idx) => {
      const dateStr = item.validFrom ? new Date(item.validFrom).toLocaleTimeString() : String(idx);
      return {
        idx,
        date: dateStr, // eixo X usa esta chave
        quantity: Number(item.quantity),
        averagePrice: Number(item.averagePrice),
        raw: item,
        __xKey: dateStr
      };
    });
  }, [data]);

  // Quando os dados são recarregados invalidamos seleção
  useEffect(() => {
    setSelectedPoint(null);
    setHoverPoint(null);
  }, [symbol, userId]);

  const handleChartClick = useCallback((e) => {
    if (e && e.activePayload && e.activePayload.length > 0) {
      const raw = e.activePayload[0].payload.raw;
      // Toggle: se clicar no mesmo ponto, fecha
      setSelectedPoint(prev => (prev === raw ? null : raw));
    } else {
      // clique em área vazia fecha
      setSelectedPoint(null);
    }
  }, []);

  const handleChartMouseMove = useCallback((e) => {
    if (selectedPoint) return; // se há seleção fixa, não altera hover
    if (e && e.activePayload && e.activePayload.length > 0) {
      setHoverPoint(e.activePayload[0].payload.raw);
    } else {
      setHoverPoint(null);
    }
  }, [selectedPoint]);

  const currentPoint = selectedPoint || hoverPoint;

  return (
    <div className="holdings-history-wrapper">
      <h3>Holdings Timeline {symbol ? `- ${symbol}` : ''}</h3>
      {loading && <div className="hh-status">Loading...</div>}
      {error && <div className="hh-error">{error}</div>}
      {!loading && !error && chartData.length === 0 && (
        <div className="hh-status">No data</div>
      )}
      {chartData.length > 0 && (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
              onClick={handleChartClick}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={() => { if (!selectedPoint) setHoverPoint(null); }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" dataKey="quantity" orientation="left" stroke="var(--chart-quantity-line)" />
              <YAxis yAxisId="right" dataKey="averagePrice" orientation="right" stroke="var(--chart-price-line)" />
              <Tooltip 
                formatter={(value, _name, payload) => {
                  const key = payload && payload.dataKey;
                  const label = key === 'quantity' ? 'Quantidade' : 'Preço Médio';
                  return [value, label];
                }} 
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="quantity"
                stroke="var(--chart-quantity-line)"
                activeDot={{ r: 8 }}
                name="Quantidade"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averagePrice"
                stroke="var(--chart-price-line)"
                name="Preço Médio"
              />
              {currentPoint && (() => {
                const match = chartData.find(d => d.raw === currentPoint);
                if (!match || match.quantity == null || match.date == null) return null;
                return (
                  <ReferenceDot
                    x={match.date}
                    y={match.quantity}
                    yAxisId="left"
                    r={6}
                    stroke={selectedPoint ? 'var(--chart-reference-selected)' : 'var(--chart-reference-hover)'}
                    strokeWidth={2}
                    ifOverflow="discard"
                  />
                );
              })()}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
