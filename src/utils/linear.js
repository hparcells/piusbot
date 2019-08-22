function slope(rise, run) {
  return rise / run;
}
function yIntercept(y, slope, x, teamMultiplier) {
  return y * -teamMultiplier - slope * (x * -teamMultiplier);
}
function xIntercept(y, slope, yIntercept) {
  return (y - yIntercept) / slope;
}

module.exports = {
  slope,
  yIntercept,
  xIntercept
};
