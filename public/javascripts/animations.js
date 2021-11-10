function triggerAnimationOnScrollIntersection(element, animation) {
  var intersectionObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add(animation);
        intersectionObserver.unobserve(entry.target);
      }
    });
  });
  intersectionObserver.observe(element);
}
