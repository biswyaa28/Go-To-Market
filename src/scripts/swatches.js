// Injects a PANTONE swatch card into each slide's .chrome (top-right).
export function injectSwatches(slides) {
  slides.forEach((s) => {
    const chrome = s.querySelector('.chrome');
    const sw = document.createElement('div');
    sw.className = 'swatch';
    const code = s.getAttribute('data-code');
    const name = s.getAttribute('data-name');
    sw.innerHTML = '<div class="chip" style="background:' + shadeFor(name) + '"></div><div><div class="code">PANTONE ' + code + '</div><div class="name">' + name.toUpperCase() + '</div></div>';
    chrome.appendChild(sw);
  });
}

function shadeFor(name) {
  const map = {
    'Bright White':'#F5F5F3','Pavement':'#B9B8B3','Steel Gray':'#8C8B87','Castlerock':'#6E6D69',
    'Blanc de Blanc':'#EDEDEA','Ash':'#A9A8A3','Charcoal Gray':'#4A4946','High-Rise':'#8f8e8a',
    'Jet Black':'#161615','Glacier Gray':'#C7C6C1','Gargoyle':'#767570','Silver Lining':'#D6D5D0',
    'Anthracite':'#302f2d','Bone White':'#E6E4DE','Black Beauty':'#0d0d0c'
  };
  return map[name] || '#999';
}
