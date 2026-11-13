// src/Admin/pages/AIInsights.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Tab, ProgressBar, Alert, Table, OverlayTrigger, Tooltip } from 'react-bootstrap';
import axiosInstance from '../../utils/axiosConfig';
import Header from '../header-footer/header';
import Footer from '../header-footer/footer';
import '../Style/inventory.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

const WEATHER_REMIND_KEY = 'weatherStockAlertRemindUntil';

const isWeatherRemindedUntilTomorrow = () => {
  try {
    const until = localStorage.getItem(WEATHER_REMIND_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  } catch {
    return false;
  }
};

const setWeatherRemindTomorrow = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  localStorage.setItem(WEATHER_REMIND_KEY, String(tomorrow.getTime()));
};

const clearWeatherRemind = () => {
  localStorage.removeItem(WEATHER_REMIND_KEY);
};

const formatWeatherDate = (iso) => {
  if (!iso) return new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  try {
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(iso);
  }
};

const priorityBadgeClass = (priority) => {
  if (priority === 'critical') return 'wx-priority wx-priority--critical';
  if (priority === 'high') return 'wx-priority wx-priority--high';
  return 'wx-priority wx-priority--normal';
};

const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return decimals > 0 ? num.toFixed(decimals) : String(Math.round(num));
};

const isRedundantGeneric = (brand, generic) => {
  if (!generic) return true;
  const b = String(brand || '').trim().toLowerCase();
  const g = String(generic || '').trim().toLowerCase();
  return !g || b === g || b.includes(g) || g.includes(b);
};

const buildClientForecastFallback = (item = {}) => {
  const daily = formatNumber(item.forecastedDailyDemand ?? item.salesVelocity, 1);
  const days = item.daysRemaining === 999 ? '90+ days' : `${formatNumber(item.daysRemaining)} days`;
  const trend = item.trend === 'rising' ? 'rising' : item.trend === 'falling' ? 'falling' : 'steady';
  return `Expect ~${daily} units/day with ${trend} demand. About ${days} of stock at current pace.`;
};

const buildClientDiscountFallback = (item = {}) => {
  const discount = formatNumber(item.suggestedDiscount);
  if (item.likelySellBeforeExpiry) {
    return `Controlled ${discount}% discount should help this batch sell before expiry.`;
  }
  return `Suggested ${discount}% clearance to improve sell-through while protecting margin.`;
};

const InsightSourceBadge = ({ aiSource }) => {
  if (aiSource === 'gemini') {
    return <span className="ai-source-badge ai-source-gemini">Gemini</span>;
  }
  return <span className="ai-source-badge ai-source-insight">Smart Insight</span>;
};

const MedicineCell = ({ brandName, genericName, category, seasonalityNotes }) => (
  <div className="ai-med-cell">
    <div className="ai-med-primary">
      <strong className="ai-med-name">{brandName}</strong>
      {!isRedundantGeneric(brandName, genericName) && (
        <span className="ai-med-generic">{genericName}</span>
      )}
    </div>
    {category && <span className="ai-category-badge">{category}</span>}
    {seasonalityNotes && seasonalityNotes !== 'No strong seasonal pattern detected' && (
      <div className="ai-season-note" title={seasonalityNotes}>
        <i className="bi bi-calendar3 me-1" />
        {seasonalityNotes}
      </div>
    )}
  </div>
);

const InsightCell = ({ text, aiSource, item, type = 'forecast' }) => {
  const displayText = String(text || '').trim()
    || (type === 'forecast' ? buildClientForecastFallback(item) : buildClientDiscountFallback(item));

  return (
    <div className="ai-insight-cell">
      <p className="ai-insight-text" title={displayText}>
        {displayText}
      </p>
      <InsightSourceBadge aiSource={aiSource} />
    </div>
  );
};

const ForecastCell = ({ item }) => {
  const forecast = formatNumber(item.forecastedDailyDemand ?? item.salesVelocity, 1);
  const avg = formatNumber(item.salesVelocity, 1);

  return (
    <div className="ai-forecast-cell">
      <div className="ai-forecast-main">
        <span className="ai-forecast-value">{forecast}</span>
        <span className="ai-forecast-unit">units/day</span>
      </div>
      <div className="ai-forecast-avg">
        avg {avg}
        {item.forecastDiffersFromFlat && <span className="ai-adjusted-flag"> · adjusted</span>}
      </div>
    </div>
  );
};

const getOutlookStatus = (item) => {
  if (item.currentStock === 0) {
    return { label: 'Out of Stock', className: 'ai-status-badge--oos' };
  }
  if (item.daysRemaining <= 5 && item.daysRemaining !== 999) {
    return { label: 'Critical', className: 'ai-status-badge--critical' };
  }
  if (item.daysRemaining <= 10 && item.daysRemaining !== 999) {
    return { label: 'Low Stock', className: 'ai-status-badge--warning' };
  }
  if (item.trend === 'rising') {
    return { label: 'Rising Demand', className: 'ai-status-badge--rising' };
  }
  if (item.trend === 'falling') {
    return { label: 'Falling Demand', className: 'ai-status-badge--falling' };
  }
  return { label: 'Stable', className: 'ai-status-badge--stable-stock' };
};

const getOutlookDaysClass = (days) => {
  if (days <= 5 && days !== 999) return 'ai-num--danger';
  if (days <= 10 && days !== 999) return 'ai-num--warning';
  return 'ai-num--ok';
};

const OutlookCell = ({ item }) => {
  const status = getOutlookStatus(item);

  return (
    <div className="ai-outlook-cell">
      <div className={`ai-outlook-days ${getOutlookDaysClass(item.daysRemaining)}`}>
        {item.daysRemaining === 999 ? '90+' : formatNumber(item.daysRemaining)}
        <span className="ai-outlook-days-unit">days</span>
      </div>
      <span className={`ai-status-badge ${status.className}`}>{status.label}</span>
    </div>
  );
};

const AIInsights = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('forecast');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    demandForecasts: [],
    discountSuggestions: [],
    topSelling: [],
  });
  const [alertInfo, setAlertInfo] = useState(null);

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherReminded, setWeatherReminded] = useState(isWeatherRemindedUntilTomorrow);

  useEffect(() => {
    fetchAIInsights();
  }, []);

  const fetchWeatherAlerts = useCallback(async () => {
    try {
      setWeatherLoading(true);
      setWeatherError(null);
      const res = await axiosInstance.get('/api/ai/weather-alerts');
      setWeatherData(res.data);
    } catch (err) {
      console.error('Error fetching weather alerts:', err);
      setWeatherError(err.response?.data?.message || err.message || 'Failed to load weather alerts');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'weather' && !weatherData && !weatherLoading) {
      fetchWeatherAlerts();
    }
  }, [activeTab, weatherData, weatherLoading, fetchWeatherAlerts]);

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/ai/insights');
      setData({
        demandForecasts: res.data.demandForecasts || [],
        discountSuggestions: res.data.discountSuggestions || [],
        topSelling: res.data.topSelling || [],
      });
    } catch (err) {
      console.error('Error fetching smart insights:', err);
      setAlertInfo({
        type: 'danger',
        message: 'Failed to load insights from server: ' + (err.response?.data?.message || err.message),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOrderAll = () => {
    const missing = (weatherData?.alerts || []).find((a) => a.type === 'missing');
    const reorder = (weatherData?.alerts || []).find((a) => a.type === 'reorder' && a.orderQty > 0);
    const target = reorder || missing;
    if (target?.brandName && target.type === 'reorder') {
      navigate(`/admin/pages/inventory?search=${encodeURIComponent(target.brandName)}`);
    } else {
      navigate('/admin/pages/inventory');
    }
  };

  const handleRemindTomorrow = () => {
    setWeatherRemindTomorrow();
    setWeatherReminded(true);
    setAlertInfo({
      type: 'info',
      message: 'Weather Stock Alerts dismissed until tomorrow morning.',
    });
    setTimeout(() => setAlertInfo(null), 4000);
  };

  const handleShowWeatherAgain = () => {
    clearWeatherRemind();
    setWeatherReminded(false);
  };

  const handleApplyDiscount = async (id, discountVal) => {
    try {
      const res = await axiosInstance.put(`/api/inventory/${id}/discount`, { discount: discountVal });
      const applied = res.data.appliedDiscount ?? discountVal;
      setAlertInfo({
        type: 'success',
        message: res.data.message || `Successfully applied promotion discount of ${applied}% to ${res.data.item.brandName}!`,
      });
      fetchAIInsights();
      setTimeout(() => setAlertInfo(null), 5000);
    } catch (err) {
      console.error('Error applying discount:', err);
      alert('Failed to apply discount: ' + (err.response?.data?.message || err.message));
    }
  };

  const getDaysClass = (days) => {
    if (days <= 5) return 'ai-num ai-num--danger';
    if (days <= 10) return 'ai-num ai-num--warning';
    return 'ai-num ai-num--ok';
  };

  const getRiskBadge = (level) => {
    if (level === 'Critical') return <span className="ai-status-badge ai-status-badge--oos">Critical Risk</span>;
    if (level === 'High') return <span className="ai-status-badge ai-status-badge--critical">High Expiry Risk</span>;
    if (level === 'Medium') return <span className="ai-status-badge ai-status-badge--medium">Medium Risk</span>;
    if (level === 'Slow Moving') return <span className="ai-status-badge ai-status-badge--stable">Slow Moving</span>;
    return <span className="ai-status-badge ai-status-badge--stable-stock">Low Risk</span>;
  };

  const renderReorderCell = (item) => {
    if (!item.needsReorder) {
      return <span className="ai-muted">Not needed</span>;
    }

    const qty = item.suggestedReorderQty ?? 0;
    const forecast30 = item.forecasted30DayDemand;
    const tooltip = (
      <Tooltip id={`reorder-${item._id}`}>
        {forecast30 != null && <div>30-day forecast: {formatNumber(forecast30)} units</div>}
        {item.aiSource === 'gemini' && item.aiSuggestedReorder != null && (
          <div>Gemini advisory: {formatNumber(item.aiSuggestedReorder)} units</div>
        )}
      </Tooltip>
    );

    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <div className="ai-reorder-cell">
          <span className="ai-reorder-qty">+{formatNumber(qty)} units</span>
          {item.aiSource === 'gemini' && item.aiSuggestedReorder != null
            && item.aiSuggestedReorder !== qty && (
            <span className="ai-reorder-sub">Gemini: {formatNumber(item.aiSuggestedReorder)}</span>
          )}
        </div>
      </OverlayTrigger>
    );
  };

  return (
    <>
      <Header />
      <div className="inventory-page-wrapper">
        <div className="container-d">
          <div className="inventory-header-section">
            <h1 className="h1blue">
              <i className="bi bi-cpu" style={{ marginRight: '10px' }} />
              Smart Hub &amp; Forecasting
            </h1>
          </div>
        </div>

        <div className="admin-management-section">
          {alertInfo && (
            <Alert variant={alertInfo.type} onClose={() => setAlertInfo(null)} dismissible className="mx-3 mt-3">
              {alertInfo.message}
            </Alert>
          )}

          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4 mx-3 ai-insights-tabs"
            variant="pills"
          >
            <Tab eventKey="forecast" title={<span><i className="bi bi-graph-up-arrow me-2" />Demand Forecaster</span>}>
              <div className="p-3 ai-insights-panel">
                <h4 className="mb-3 text-primary">Medicine Demand &amp; Stock-Out Predictions</h4>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-2">Calculating forecast metrics...</p>
                  </div>
                ) : data.demandForecasts.length > 0 ? (
                  <div className="ai-table-wrap">
                    <Table className="ai-insights-table align-middle" hover>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th className="text-end">Stock</th>
                          <th className="text-end d-none d-md-table-cell">Threshold</th>
                          <th className="text-end">Forecast</th>
                          <th className="d-none d-lg-table-cell">Outlook</th>
                          <th className="text-end">Reorder</th>
                          <th>Advisory</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.demandForecasts.map((item) => (
                          <tr key={item._id}>
                            <td>
                              <MedicineCell
                                brandName={item.brandName}
                                genericName={item.genericName}
                                category={item.category}
                                seasonalityNotes={item.seasonalityNotes}
                              />
                            </td>
                            <td className="text-end">
                              <span className="ai-num">{formatNumber(item.currentStock)}</span>
                              <div className="ai-cell-sub">units</div>
                            </td>
                            <td className="text-end d-none d-md-table-cell">
                              <span className="ai-num">{formatNumber(item.smartLowStockThreshold)}</span>
                              <div className={`ai-cell-sub ${item.belowSmartThreshold ? 'ai-cell-sub--warn' : ''}`}>
                                {item.belowSmartThreshold ? 'Below threshold' : 'OK'}
                              </div>
                            </td>
                            <td className="text-end">
                              <ForecastCell item={item} />
                            </td>
                            <td className="d-none d-lg-table-cell">
                              <OutlookCell item={item} />
                            </td>
                            <td className="text-end">{renderReorderCell(item)}</td>
                            <td>
                              <InsightCell
                                text={item.aiNarrative}
                                aiSource={item.aiSource}
                                item={item}
                                type="forecast"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-box-seam fs-1 d-block mb-3" />
                    No inventory items loaded. Add medicines to run demand forecasts.
                  </div>
                )}
              </div>
            </Tab>

            <Tab eventKey="promotions" title={<span><i className="bi bi-tags-fill me-2" />Dynamic Pricing &amp; Discounts</span>}>
              <div className="p-3 ai-insights-panel">
                <h4 className="mb-3 text-primary">Smart Clearances &amp; Expiry Prevention</h4>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-2">Calculating promotion models...</p>
                  </div>
                ) : data.discountSuggestions.length > 0 ? (
                  <div className="ai-table-wrap">
                    <Table className="ai-insights-table align-middle" hover>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Batch</th>
                          <th className="text-end">Qty</th>
                          <th className="text-end d-none d-md-table-cell">Expires</th>
                          <th className="text-end">Price</th>
                          <th className="text-end">Discount</th>
                          <th>Advisory</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.discountSuggestions.map((item) => (
                          <tr key={item._id + (item.batchNumber || '')}>
                            <td>
                              <MedicineCell
                                brandName={item.brandName}
                                genericName={item.genericName}
                              />
                            </td>
                            <td>
                              <span className="ai-batch-badge">{item.batchNumber}</span>
                            </td>
                            <td className="text-end">
                              <span className="ai-num">{formatNumber(item.quantity)}</span>
                            </td>
                            <td className="text-end d-none d-md-table-cell">
                              {item.daysRemaining === 999 ? (
                                <span className="ai-muted">Slow-moving</span>
                              ) : (
                                <span className={getDaysClass(item.daysRemaining)}>
                                  {formatNumber(item.daysRemaining)} days
                                </span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="ai-num">Rs. {item.currentPrice.toFixed(2)}</div>
                              <div className="ai-cell-sub ai-cell-sub--success">
                                → Rs. {item.discountedPrice.toFixed(2)}
                              </div>
                            </td>
                            <td className="text-end">
                              <span className="ai-discount-pct">-{formatNumber(item.suggestedDiscount)}%</span>
                              {item.wasCapped && item.idealDiscount > item.suggestedDiscount && (
                                <div className="ai-cell-sub text-decoration-line-through">
                                  ideal {formatNumber(item.idealDiscount)}%
                                </div>
                              )}
                              <div className="mt-1">{getRiskBadge(item.riskLevel)}</div>
                            </td>
                            <td>
                              <InsightCell
                                text={item.aiSuggestedDiscountReason}
                                aiSource={item.aiSource}
                                item={item}
                                type="discount"
                              />
                              {typeof item.projectedSellThroughDays === 'number' && (
                                <div className="ai-cell-sub mt-1">
                                  Sell-through: {item.projectedSellThroughDays === 999 ? 'Unknown' : `${formatNumber(item.projectedSellThroughDays, 1)} days`}
                                  {' · '}
                                  {item.likelySellBeforeExpiry ? 'Likely before expiry' : 'Expiry risk'}
                                </div>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-success ai-apply-btn"
                                onClick={() => handleApplyDiscount(item._id, item.suggestedDiscount)}
                              >
                                <i className="bi bi-lightning-fill" />
                                Apply
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-patch-check fs-1 d-block mb-3" />
                    All stock looks stable! No expiry risk or slow-moving items requiring discount clearances.
                  </div>
                )}
              </div>
            </Tab>

            <Tab eventKey="top" title={<span><i className="bi bi-star-fill me-2" />Top-Sellers Chart</span>}>
              <div className="p-3">
                <h4 className="mb-3 text-primary">Top-Selling Medicines &amp; Revenue Leaderboard</h4>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-2">Analyzing sales databases...</p>
                  </div>
                ) : data.topSelling.length > 0 ? (
                  <div className="row g-4 mt-2">
                    <div className="col-lg-6">
                      <div className="card p-3 shadow-sm">
                        <h5 className="mb-4 text-secondary"><i className="bi bi-box-seam me-2" />Sales Volume Leaderboard</h5>
                        {data.topSelling.map((item, idx) => {
                          const maxQty = data.topSelling[0]?.totalSold || 1;
                          const pct = (item.totalSold / maxQty) * 100;
                          return (
                            <div key={idx} className="mb-3">
                              <div className="d-flex justify-content-between mb-1">
                                <strong>{item.brandName}</strong>
                                <span className="text-primary">{item.totalSold} sold</span>
                              </div>
                              <ProgressBar now={pct} variant="primary" style={{ height: '8px' }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="card p-3 shadow-sm">
                        <h5 className="mb-4 text-secondary"><i className="bi bi-cash-coin me-2" />Revenue Generated</h5>
                        {data.topSelling.map((item, idx) => {
                          const maxRev = Math.max(...data.topSelling.map((s) => s.totalRevenue)) || 1;
                          const pct = (item.totalRevenue / maxRev) * 100;
                          return (
                            <div key={idx} className="mb-3">
                              <div className="d-flex justify-content-between mb-1">
                                <strong>{item.brandName}</strong>
                                <span className="text-success">Rs. {item.totalRevenue.toLocaleString()}</span>
                              </div>
                              <ProgressBar now={pct} variant="success" style={{ height: '8px' }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-graph-down fs-1 d-block mb-3" />
                    No sales logs found. Complete sales in the POS page to construct sales graphs.
                  </div>
                )}
              </div>
            </Tab>

            <Tab
              eventKey="weather"
              title={(
                <span>
                  <i className="bi bi-cloud-sun me-2" />
                  Weather Stock Alerts
                  {weatherData?.highDemandCount > 0 && !weatherReminded && (
                    <span className="wx-tab-count ms-2">{weatherData.highDemandCount}</span>
                  )}
                </span>
              )}
            >
              <div className="p-3 ai-insights-panel">
                {weatherReminded ? (
                  <div className="wx-reminded-banner">
                    <div>
                      <i className="bi bi-bell-slash me-2" />
                      Alerts are snoozed until tomorrow.
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleShowWeatherAgain}>
                      Show alerts again
                    </button>
                  </div>
                ) : null}

                {weatherLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-2">Checking Pakistan weather &amp; 30-day seasonal demand...</p>
                  </div>
                ) : weatherError ? (
                  <div className="text-center py-5">
                    <i className="bi bi-exclamation-triangle fs-1 text-warning d-block mb-3" />
                    <p className="text-muted mb-3">{weatherError}</p>
                    <button type="button" className="btn btn-primary btn-sm" onClick={fetchWeatherAlerts}>
                      <i className="bi bi-arrow-clockwise me-1" />
                      Retry
                    </button>
                  </div>
                ) : weatherData ? (
                  <>
                    <div className="wx-header-card">
                      <div className="wx-header-top">
                        <div>
                          <h4 className="wx-title mb-1">
                            <i className="bi bi-cloud-sun-fill me-2" />
                            Weather Stock Alert
                          </h4>
                          <div className="wx-meta">
                            <span>
                              <i className="bi bi-geo-alt me-1" />
                              {weatherData.weather?.city}
                              {weatherData.weather?.area ? `, ${weatherData.weather.area}` : ''}
                              <span className="wx-meta-sep">·</span>
                              Pakistan-wide
                            </span>
                            <span className="wx-meta-sep">·</span>
                            <span>
                              <i className="bi bi-calendar3 me-1" />
                              {formatWeatherDate(weatherData.weather?.fetchedAt)}
                            </span>
                            <span className="wx-meta-sep">·</span>
                            <span>
                              <i className="bi bi-hourglass-split me-1" />
                              {weatherData.meta?.horizonDays || 30}-day forecast
                            </span>
                          </div>
                        </div>
                        <div className="wx-temp-block">
                          <div className="wx-temp">
                            {formatNumber(weatherData.weather?.temp, 1)}
                            <span className="wx-temp-unit">°C</span>
                          </div>
                          <div className="wx-condition">
                            {weatherData.weather?.condition || weatherData.weather?.description}
                            <span className="wx-humidity">
                              {' · '}
                              <i className="bi bi-droplet-half" />
                              {' '}
                              {formatNumber(weatherData.weather?.humidity)}
                              % humidity
                            </span>
                          </div>
                          {weatherData.nationalContext?.seasonLabel && (
                            <div className="wx-source-note">{weatherData.nationalContext.seasonLabel}</div>
                          )}
                        </div>
                      </div>

                      {weatherData.nationalContext?.planningNote && (
                        <p className="wx-national-note">
                          <i className="bi bi-flag me-1" />
                          {weatherData.nationalContext.planningNote}
                        </p>
                      )}

                      {(weatherData.multiCity || []).length > 0 && (
                        <div className="wx-city-row">
                          {weatherData.multiCity.map((c) => (
                            <span
                              key={c.city}
                              className={`wx-city-chip${c.isPrimary ? ' wx-city-chip--primary' : ''}`}
                              title={`${c.condition || ''} · ${c.humidity ?? '—'}% humidity`}
                            >
                              {c.city}
                              {' '}
                              <strong>{formatNumber(c.temp, 0)}°</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {weatherData.aiNarrative && (
                        <p className="wx-narrative">
                          {weatherData.aiNarrative}
                          <InsightSourceBadge aiSource={weatherData.aiSource === 'gemini' ? 'gemini' : 'fallback'} />
                        </p>
                      )}

                      {(weatherData.eventNotes || []).length > 0 && (
                        <div className="wx-events">
                          {weatherData.eventNotes.map((ev) => (
                            <span key={ev.id} className="wx-event-chip" title={ev.detail}>
                              <i className="bi bi-calendar-event me-1" />
                              {ev.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {!weatherReminded && (
                      <>
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 mt-4">
                          <h5 className="mb-0 text-primary">
                            Next 30 days — seasonal stock actions
                            {weatherData.highDemandCount > 0 && (
                              <span className="wx-inline-count ms-2">{weatherData.highDemandCount}</span>
                            )}
                          </h5>
                          <div className="wx-actions">
                            {(weatherData.alerts || []).length > 0 && (
                              <>
                                <button type="button" className="btn btn-primary btn-sm" onClick={handleOrderAll}>
                                  <i className="bi bi-cart-plus me-1" />
                                  Order / Inventory
                                </button>
                                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleRemindTomorrow}>
                                  <i className="bi bi-clock-history me-1" />
                                  Remind Tomorrow
                                </button>
                              </>
                            )}
                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={fetchWeatherAlerts}>
                              <i className="bi bi-arrow-clockwise" />
                            </button>
                          </div>
                        </div>

                        {(() => {
                          const missingAlerts = (weatherData.alerts || []).filter((a) => a.type === 'missing');
                          const reorderAlerts = (weatherData.alerts || []).filter((a) => a.type === 'reorder');
                          if (missingAlerts.length === 0 && reorderAlerts.length === 0) {
                            return (
                              <div className="text-center py-5 text-muted wx-empty">
                                <i className="bi bi-check2-circle fs-1 d-block mb-3 text-success" />
                                Seasonal essentials are in stock — looking good for the next 30 days.
                                <div className="ai-cell-sub mt-2">
                                  The weather card above shows Pakistan-wide seasonal context.
                                </div>
                              </div>
                            );
                          }
                          return (
                            <>
                              {missingAlerts.length > 0 && (
                                <div className="mb-4">
                                  <h6 className="wx-section-title wx-section-title--missing">
                                    <i className="bi bi-exclamation-octagon me-2" />
                                    Missing from stock
                                    <span className="wx-inline-count ms-2">{missingAlerts.length}</span>
                                  </h6>
                                  <div className="ai-table-wrap">
                                    <Table className="ai-insights-table align-middle" hover>
                                      <thead>
                                        <tr>
                                          <th>Medicine</th>
                                          <th>Status</th>
                                          <th className="text-end">Suggested (30d)</th>
                                          <th className="d-none d-md-table-cell">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {missingAlerts.map((item) => (
                                          <tr key={item._id} className="wx-row wx-row--missing">
                                            <td>
                                              <MedicineCell
                                                brandName={item.brandName}
                                                genericName={item.genericName}
                                                category={item.category}
                                              />
                                            </td>
                                            <td>
                                              <span className="wx-type-badge wx-type-badge--missing">Missing</span>
                                            </td>
                                            <td className="text-end">
                                              <span className="wx-order-qty">
                                                ORDER {formatNumber(item.orderQty)}
                                              </span>
                                            </td>
                                            <td className="d-none d-md-table-cell">
                                              <div className="wx-reasons" title={item.usedFor || ''}>
                                                {item.usedFor || 'Used for seasonal weather-related demand'}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              {reorderAlerts.length > 0 && (
                                <div className="mb-2">
                                  <h6 className="wx-section-title wx-section-title--reorder">
                                    <i className="bi bi-arrow-repeat me-2" />
                                    Low stock — reorder (30-day need)
                                    <span className="wx-inline-count ms-2">{reorderAlerts.length}</span>
                                  </h6>
                                  <div className="ai-table-wrap">
                                    <Table className="ai-insights-table align-middle" hover>
                                      <thead>
                                        <tr>
                                          <th>Medicine</th>
                                          <th className="text-end">Current stock</th>
                                          <th className="text-end">Need (30d)</th>
                                          <th className="text-end">Order</th>
                                          <th>Priority</th>
                                          <th className="d-none d-md-table-cell">Why</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {reorderAlerts.map((item) => (
                                          <tr key={item._id} className={`wx-row wx-row--${item.priority}`}>
                                            <td>
                                              <MedicineCell
                                                brandName={item.brandName}
                                                genericName={item.genericName}
                                                category={item.category}
                                              />
                                            </td>
                                            <td className="text-end">
                                              <span className="ai-num">{formatNumber(item.currentStock)}</span>
                                              <div className="ai-cell-sub">units</div>
                                            </td>
                                            <td className="text-end">
                                              <span className="ai-num">
                                                {formatNumber(item.predictedNeed30Days ?? item.predictedNeed7Days)}
                                              </span>
                                              <div className="ai-cell-sub">
                                                ×{formatNumber(item.weatherMultiplier, 2)} weather
                                              </div>
                                            </td>
                                            <td className="text-end">
                                              <span className="wx-order-qty">
                                                ORDER {formatNumber(item.orderQty)} more
                                              </span>
                                            </td>
                                            <td>
                                              <span className={priorityBadgeClass(item.priority)}>
                                                {item.priority}
                                              </span>
                                            </td>
                                            <td className="d-none d-md-table-cell">
                                              <div className="wx-reasons" title={(item.reasons || []).join('; ')}>
                                                {(item.reasons || []).slice(0, 2).join(' · ') || '—'}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <button type="button" className="btn btn-primary btn-sm" onClick={fetchWeatherAlerts}>
                      Load weather alerts
                    </button>
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AIInsights;
