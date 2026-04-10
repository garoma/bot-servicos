function isSameMonth(d1, d2) {
  return (
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
}

module.exports = {
  isSameMonth
};