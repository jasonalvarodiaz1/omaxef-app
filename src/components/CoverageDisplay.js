import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  Box,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Info,
  ExpandMore,
  Refresh,
  TrendingUp,
  Description,
  Timeline
} from '@mui/icons-material';
import { CriteriaStatus, normalizeStatus } from '../constants';
import { evaluateCoverage } from '../utils/coverageEvaluator';

export function CoverageDisplay({ 
  patientId, 
  medication, 
  dose,
  onGeneratePA,
  onCriterionOverride 
}) {
  const [loading, setLoading] = useState(true);
  const [coverageResult, setCoverageResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedCriteria, setExpandedCriteria] = useState([]);
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    evaluateCoverageAsync();
  }, [patientId, medication, dose]);

  const evaluateCoverageAsync = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await evaluateCoverage(patientId, medication, dose);
      setCoverageResult(result);
    } catch (err) {
      console.error('Coverage evaluation failed:', err);
      setError(err.message || 'Failed to evaluate coverage');
      setCoverageResult({
        error: err.message,
        criteriaResults: [],
        recommendations: [{
          priority: 'high',
          action: 'manual_review',
          message: 'Automated evaluation failed. Manual review required.'
        }]
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate approval score with confidence weighting
  const approvalScore = useMemo(() => {
    if (!coverageResult?.criteriaResults || coverageResult.criteriaResults.length === 0) return 0;
    
    const weights = {
      [CriteriaStatus.MET]: 1,
      [CriteriaStatus.NOT_MET]: 0,
      [CriteriaStatus.PARTIALLY_MET]: 0.5,
      [CriteriaStatus.PENDING_DOCUMENTATION]: 0.3,
      [CriteriaStatus.NOT_APPLICABLE]: null // Don't count N/A in scoring
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    coverageResult.criteriaResults.forEach(result => {
      const status = normalizeStatus(result.status);
      const weight = weights[status];
      
      if (weight !== null && weight !== undefined) {
        const confidence = result.confidence || 1;
        const isRequired = result.required !== false; // Assume required unless explicitly false
        const criterionWeight = isRequired ? 2 : 1;
        
        totalScore += weight * confidence * criterionWeight;
        totalWeight += criterionWeight;
      }
    });
    
    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  }, [coverageResult]);

  // Get status icon
  const getStatusIcon = (status) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case CriteriaStatus.MET:
        return <CheckCircle color="success" />;
      case CriteriaStatus.NOT_MET:
        return <Cancel color="error" />;
      case CriteriaStatus.PARTIALLY_MET:
      case CriteriaStatus.PENDING_DOCUMENTATION:
        return <Warning color="warning" />;
      case CriteriaStatus.NOT_APPLICABLE:
        return <Info color="disabled" />;
      default:
        return <Info color="disabled" />;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (!confidence && confidence !== 0) return 'default';
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  // Get approval score color
  const getApprovalColor = () => {
    if (approvalScore >= 80) return 'success.main';
    if (approvalScore >= 60) return 'warning.main';
    return 'error.main';
  };

  // Handle criterion override
  const handleOverride = (criterionIndex, newStatus, reason) => {
    setOverrides(prev => ({
      ...prev,
      [criterionIndex]: { status: newStatus, reason, timestamp: Date.now() }
    }));
    
    if (onCriterionOverride) {
      onCriterionOverride(criterionIndex, newStatus, reason);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Evaluating Coverage Criteria...
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Analyzing patient data against {medication?.name || 'medication'} criteria
          </Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !coverageResult) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={evaluateCoverageAsync}>
                <Refresh sx={{ mr: 0.5 }} /> Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!coverageResult) {
    return null;
  }

  const { criteriaResults = [], summary, recommendations = [] } = coverageResult;

  return (
    <Box>
      {/* Summary Card with Score */}
      <Card sx={{ mb: 3, borderTop: `4px solid`, borderColor: getApprovalColor() }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h5" gutterBottom>
                Prior Authorization Assessment
              </Typography>
              <Typography color="textSecondary" gutterBottom>
                {medication?.name} - {dose}
              </Typography>
              {summary && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {summary}
                </Typography>
              )}
              
              {/* Quick Stats */}
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  size="small" 
                  label={`${criteriaResults.filter(r => normalizeStatus(r.status) === CriteriaStatus.MET).length} Met`}
                  color="success"
                  variant="outlined"
                />
                <Chip 
                  size="small" 
                  label={`${criteriaResults.filter(r => normalizeStatus(r.status) === CriteriaStatus.NOT_MET).length} Not Met`}
                  color="error"
                  variant="outlined"
                />
                <Chip 
                  size="small" 
                  label={`${criteriaResults.filter(r => normalizeStatus(r.status) === CriteriaStatus.PENDING_DOCUMENTATION).length} Pending`}
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
                <Box textAlign="center">
                  <Typography 
                    variant="h2" 
                    color={getApprovalColor()}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {approvalScore}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Approval Likelihood
                  </Typography>
                </Box>
                
                <Box>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Description />}
                    onClick={() => onGeneratePA && onGeneratePA(coverageResult)}
                    disabled={!onGeneratePA || approvalScore < 30}
                    sx={{ mb: 1 }}
                  >
                    Generate PA
                  </Button>
                  <IconButton 
                    size="small" 
                    onClick={evaluateCoverageAsync}
                    sx={{ display: 'block', mx: 'auto' }}
                  >
                    <Refresh />
                  </IconButton>
                </Box>
              </Box>
            </Grid>
          </Grid>
          
          {/* Progress Bar */}
          <Box mt={3}>
            <LinearProgress 
              variant="determinate" 
              value={approvalScore}
              sx={{ 
                height: 10, 
                borderRadius: 5,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  background: approvalScore >= 80 
                    ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
                    : approvalScore >= 60
                    ? 'linear-gradient(90deg, #ff9800, #ffb74d)'
                    : 'linear-gradient(90deg, #f44336, #ef5350)'
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* High Priority Recommendations */}
      {recommendations.filter(r => r.priority === 'high').length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          icon={<Warning />}
        >
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Action Required:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {recommendations
              .filter(r => r.priority === 'high')
              .slice(0, 3)
              .map((rec, idx) => (
                <li key={idx}>
                  <Typography variant="body2">{rec.message}</Typography>
                  {rec.steps && (
                    <Box component="ul" sx={{ m: 0, pl: 2 }}>
                      {rec.steps.slice(0, 2).map((step, stepIdx) => (
                        <li key={stepIdx}>
                          <Typography variant="caption" color="textSecondary">
                            {step}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  )}
                </li>
              ))
            }
          </Box>
        </Alert>
      )}

      {/* Criteria Details */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Criteria Evaluation Details
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {criteriaResults.length === 0 ? (
            <Alert severity="info">
              No criteria results available. Please check the medication configuration.
            </Alert>
          ) : (
            criteriaResults.map((result, index) => {
              const isExpanded = expandedCriteria.includes(index);
              const overridden = overrides[index];
              const effectiveStatus = overridden?.status || normalizeStatus(result.status);
              
              return (
                <Accordion
                  key={index}
                  expanded={isExpanded}
                  onChange={(_, expanded) => {
                    setExpandedCriteria(prev =>
                      expanded 
                        ? [...prev, index]
                        : prev.filter(i => i !== index)
                    );
                  }}
                  sx={{ 
                    mb: 1,
                    border: overridden ? '2px solid orange' : 'none',
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    sx={{ 
                      '& .MuiAccordionSummary-content': { 
                        alignItems: 'center' 
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" width="100%" gap={2}>
                      <Box sx={{ flexShrink: 0 }}>
                        {getStatusIcon(effectiveStatus)}
                      </Box>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">
                          {result.criterion}
                          {result.required !== false && (
                            <Chip 
                              label="Required" 
                              size="small" 
                              color="primary" 
                              sx={{ ml: 1, height: 20 }}
                            />
                          )}
                          {overridden && (
                            <Chip 
                              label="Overridden" 
                              size="small" 
                              color="warning" 
                              sx={{ ml: 1, height: 20 }}
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {result.displayValue || 'No value'}
                        </Typography>
                      </Box>
                      
                      {result.confidence !== undefined && (
                        <Tooltip title="Data confidence level">
                          <Chip
                            label={`${Math.round((result.confidence || 0) * 100)}%`}
                            size="small"
                            color={getConfidenceColor(result.confidence)}
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        {/* Reason */}
                        <Typography variant="body2" paragraph>
                          {result.reason}
                        </Typography>
                        
                        {/* Evidence & Warnings */}
                        {result.evidence && result.evidence.length > 0 && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                              Evidence & Data Quality:
                            </Typography>
                            {result.evidence.map((item, idx) => (
                              <Alert 
                                key={idx} 
                                severity={item.type || 'info'} 
                                sx={{ mb: 1 }}
                                icon={
                                  item.type === 'warning' ? <Warning /> :
                                  item.type === 'error' ? <Cancel /> :
                                  <Info />
                                }
                              >
                                {item.message}
                              </Alert>
                            ))}
                          </Box>
                        )}
                        
                        {/* Details */}
                        {result.details && Object.keys(result.details).length > 0 && (
                          <Box mb={2}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                              Details:
                            </Typography>
                            <Box sx={{ 
                              bgcolor: 'grey.50', 
                              p: 1.5, 
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}>
                              {Object.entries(result.details).map(([key, value]) => (
                                <div key={key}>
                                  <strong>{key}:</strong> {JSON.stringify(value)}
                                </div>
                              ))}
                            </Box>
                          </Box>
                        )}
                        
                        {/* Recommendation */}
                        {result.recommendation && (
                          <Alert severity="info" icon={<TrendingUp />}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                              Recommendation:
                            </Typography>
                            <Typography variant="body2" paragraph>
                              {result.recommendation.message}
                            </Typography>
                            {result.recommendation.steps && (
                              <Box component="ol" sx={{ m: 0, pl: 2 }}>
                                {result.recommendation.steps.map((step, idx) => (
                                  <li key={idx}>
                                    <Typography variant="body2">{step}</Typography>
                                  </li>
                                ))}
                              </Box>
                            )}
                          </Alert>
                        )}
                      </Grid>
                      
                      {/* Override Controls */}
                      {onCriterionOverride && (
                        <Grid item xs={12} md={4}>
                          <Box 
                            sx={{ 
                              p: 2, 
                              bgcolor: 'background.default', 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                              Clinical Override:
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              fullWidth
                              onClick={() => handleOverride(index, CriteriaStatus.MET, 'Clinical judgment')}
                              disabled={effectiveStatus === CriteriaStatus.MET}
                              sx={{ mb: 1 }}
                            >
                              Mark as Met
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              fullWidth
                              onClick={() => handleOverride(index, CriteriaStatus.NOT_APPLICABLE, 'Not applicable')}
                              disabled={effectiveStatus === CriteriaStatus.NOT_APPLICABLE}
                              sx={{ mb: 1 }}
                            >
                              Mark as N/A
                            </Button>
                            {overridden && (
                              <Button
                                size="small"
                                variant="outlined"
                                fullWidth
                                color="warning"
                                onClick={() => {
                                  const newOverrides = { ...overrides };
                                  delete newOverrides[index];
                                  setOverrides(newOverrides);
                                }}
                              >
                                Remove Override
                              </Button>
                            )}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Additional Recommendations */}
      {recommendations.filter(r => r.priority !== 'high').length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Additional Recommendations
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {recommendations
              .filter(r => r.priority !== 'high')
              .map((rec, index) => (
                <Alert 
                  key={index} 
                  severity="info"
                  sx={{ mb: 1 }}
                >
                  {rec.message}
                </Alert>
              ))
            }
          </CardContent>
        </Card>
      )}
    </Box>
  );
}