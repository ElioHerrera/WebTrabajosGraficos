var $grid = null,
    image_count = 0,
    $viewport = $(window),
    keyframes = {},
    sections = [],
    scroll_tracks = [],
    current_y = 0,
    current_section = -1,
    current_keyframe = {},
    global_divs = {},
    current_doc_top = 0,
    document_loaded = false,
    loading_caso_url = '',
    loading_next_caso_div = null,
    caso_scroll_throttle = null,
    root_path = '';

jbx.net.history.register(onHistoryNavigate);

$(document).ready(function() {
  inicializarFunciones();
  alternarImagenes();
  setTimeout(function() {
    document_loaded = true;
    onCasoScroll.call(window, null); 
  }, 500);
  
});


// -----------------------------------------------------------------------------

function initialize(root) {
  var top = $viewport.scrollTop();
  root_path = root;
  $grid = $('.casos .grid'); 
  $viewport.resize(onDocumentResize);
  $viewport.scroll(onDocumentScroll);
  getSections();
  getKeyframes();
  getScrollTracks();
  $grid.imagesLoaded(
    function() {
      $grid.masonry({
        columnWidth: '.column-width',
        gutter: '.column-spacer',
        itemSelector: 'figure'
      });
      sections = [];
      scroll_tracks = [];
      getSections();
      getScrollTracks();
      onDocumentScroll();
    });
  onDocumentScroll();
  document.body.className = 'initialized';
  for (i=0; i<current_section; i++) {
    keyframes[sections[i].name] && setKeyframe(sections[i], keyframes[sections[i].name].length-1);
  }
}

function initCaso(el, docScroll) {
  var nav = '',
      div = null,
      img = null,
      imgs = null,
      galleries = el.find('.gallery');
  // Inicializar galerias
  galleries.each(function(i, gal) {
    nav = '';
    setTimeout(function() { jbx.dom.classes.add(gal, 'initialized') }, 100);
    imgs = $(gal).find('img, .item');
    if (imgs.length > 1) {
      img = imgs[0].cloneNode(true);
      imgs[0].className = 'original';
      gal.insertBefore(img, jbx.dom.nextElement(jbx.dom.firstChild(gal)));
      jbx.events.listen(gal, 'mouseout', onGalleryMouseOut);
      jbx.events.listen(gal, 'mouseover', onGalleryMouseOver);
      gal.setAttribute('data-current-image-index', 0);
      setTimeout(function() { animateGallery(gal); }, 5000);
      div = document.createElement('DIV');
      div.className = 'scroll-left';
      jbx.events.listen(div, 'click', gotoGalleryPrev);
      gal.appendChild(div);
      div = document.createElement('DIV');
      div.className = 'scroll-right';
      jbx.events.listen(div, 'click', gotoGalleryNext);
      gal.appendChild(div);
      div = document.createElement('DIV');
      div.className = 'scroll-nav';
      gal.appendChild(div);
      div.style.width = (imgs.length*23)+'px';
      for (i=0; i<imgs.length; i++) {
        nav += '<td'+(i==0 ? ' class="selected"' : '')+'><div onclick="gotoGalleryImage(this, '+i+')">&nbsp;</div></td>';
      }
      div.innerHTML = '<table><tr>'+nav+'</tr></table>';
    }
  });
  // Contadores
  $('.counter', el).counterUp({
    delay: 10,
    time: 750,
    easing: 'ease-out-cubic'
  });  
  // Si es un caso no-layer poner un listener en el scroll de docuemnto
  docScroll && jbx.events.listen(window, 'scroll', onCasoScroll, window);
}

// --------- iPhone detect

function isiPhone(){
  return (
      (navigator.platform.indexOf("iPhone") != -1) ||
      (navigator.platform.indexOf("iPod") != -1)
  );
}


// --------- Home - Scroll-btn

 $(function() {
    $('.scroll-down').click (function() {
      $('html, body').animate({scrollTop: $('.scrollToSign').offset().top }, 'slow');
      return false;
    });

    if(isiPhone()){
       $('body').addClass('iphone-detect');
    } else {
       $('body').addClass('not-iphone');
    }
    
  });

  
    
  
// -----------------------------------------------------------------------------
function changeImg(elem, imagen){
  var id = $(elem).prop("id");
  document.getElementById(id).src = imagen;
}

function getDiv(id, attributes, listeners) {
  var div = global_divs[id];
  if (!div) {
    listeners = listeners || {};
    attributes = attributes || {};
    div = jbx.dom.createElement('DIV', attributes);
    for (var type in listeners) {
      jbx.events.listen(div, type, listeners[type]);
    }
    document.body.insertBefore(div, jbx.dom.firstChild(document.body));
    global_divs[id] = div;
    div.id = id;
  }
  return div;
}

function toggleForm(h2) {
  $(h2.parentNode).children().each(
    function(i, n) {
      if (n.nodeName == 'H2') {
        $(n).next()[n == h2 ? 'removeClass' : 'addClass']('hidden');
      }
    }    
  );
}

function toggleLoginForm(btn) {
  var frm = $(btn.parentNode).next(),
      current = frm.css('display');
  frm.css('display', current == 'none' ? 'block' : 'none');
  return false;
}

function scrollToElementOffset(el, top) {
  el.animate({scrollTop:top}, 1000, 'swing');  
}

function scrollToElement(el, ot) {
  var top = el.offset().top-(ot || 0),
      $body = $('html, body');
  scrollToElementOffset($body, top);
  return false;
}

function scrollToMainElement(el) {
  closeCasosLayer();
  return scrollToElement(el);
}

function scrollToCurrentTop() {
  var div = jbx.dom.getElement('layer_casos');
  if (div && div.style.display != 'none') {
    scrollToElementOffset($(div), 0);
  } else {
    scrollToElementOffset($('html, body'), 0);
  }
}

// -----------------------------------------------------------------------------

function animateGallery(gal) {
  var cidx = parseInt(gal.getAttribute('data-current-image-index'), 10);
  if (gal.getAttribute('data-mouse-over') != 'over') {
    showGalleryImage(gal, cidx+1);
  }
  setTimeout(function() { animateGallery(gal); }, 5000);
}

function showGalleryImage(gal, nidx, dir) {
  var idx = 0,
      imgs = $(gal).find('img'),
      navs = $(gal).find('.scroll-nav').find('td'),      
      cidx = parseInt(gal.getAttribute('data-current-image-index'), 10),
      len = imgs.length;
  if (nidx != cidx && gal.getAttribute('data-gallery-animating') != '1') {
    nidx = nidx > len-2 ? 0 : nidx;
    nidx = nidx < 0 ? len-2 : nidx;
    gal.setAttribute('data-current-image-index', nidx)
    imgs[nidx+1].className = dir == 1 ? 'in-left' : 'in';
    imgs[cidx+1].className = dir == 1 ? 'out-left' : 'out';
    navs[nidx].className = 'selected';
    navs[cidx].className = '';
    gal.setAttribute('data-gallery-animating', 1);
    setTimeout(function() { gal.removeAttribute('data-gallery-animating'); }, 1000);
  }
}

function gotoGalleryImage(el, i) {
  var gal = jbx.dom.resolveNode(el, 'parentNode', function(n) { return n && jbx.dom.classes.has(n, 'gallery') }),
      cidx = parseInt(gal.getAttribute('data-current-image-index'), 10);
  showGalleryImage(gal, i, i < cidx ? 1 : 0);
}

function gotoGalleryPrev(e) {
  var gal = jbx.dom.resolveNode(e.target, 'parentNode', function(n) { return n && jbx.dom.classes.has(n, 'gallery') }),
      cidx = parseInt(gal.getAttribute('data-current-image-index'), 10);
  showGalleryImage(gal, cidx-1, 1);  
}

function gotoGalleryNext(e) {
  var gal = jbx.dom.resolveNode(e.target, 'parentNode', function(n) { return n && jbx.dom.classes.has(n, 'gallery') }),
      cidx = parseInt(gal.getAttribute('data-current-image-index'), 10);
  showGalleryImage(gal, cidx+1);  
}

// -----------------------------------------------------------------------------

function closeCasosLayer() {
  var div = jbx.dom.getElement('layer_casos');
  div && div.style.display != 'none' &&
  !jbx.net.history.push(root_path, null, {type:'closecaso'}) &&
  closeCaso();
  return false;
}

function openCasoLink(a, e) {
  e = e || window.event;
  if (e.shiftKey) {
    window.open(a.href+'');
  } else
  if (e.metaKey || e.ctrlKey || e.altKet) {
    window.open(a.href+'', '_blank');
  } else {
    // El push al history ahora se hace luego de que se realice la petición XHR
    // así puedo parcear el resultado y definir otros valores de la página como
    // el título y los botones de redes sociales.
    getCasoContent(a.href);
  }
  return false;
}

function closeCaso() {
  var div = jbx.dom.getElement('layer_casos');
  document.title = 'Ellecktra';
  if (div && div.style.display != 'none') {
    $('header').removeClass('force-small');
    $('header .hamburger').removeClass('is-active');
    $('html, body').css('overflow', 'visible');   
    $('html, body').scrollTop(current_doc_top);
    jbx.dom.classes.add(div, 'fade-out');
    setTimeout(function() { div.style.display = 'none'; }, 1000);
  } 
}

function getCasoContent(url, data) {
  loading_caso_url = url;
  $('header .hamburger').addClass('is-active');	
  var div = getDiv('layer_casos');
  div.className = 'casos-layer loading';
  div.style.display = 'block';
  div.innerHTML = '<table class="inner-table"><tr><td class="inner-td"><table class="loader"><tr><td><img src="assets/gfx/loading-e.gif" width="90" height="93" /><div></td></tr></table></td></tr></table>';
  jbx.net.XHR.send(url, onGetCasoContent);
}

function openNextCaso(div) {
  var url = div.getAttribute('data-next-url'),
      loaded = div.getAttribute('data-loaded-cases');
  div.classList.add('active');
  // Que no sea tan inmediata la carga, que espere 1 segundo
  setTimeout(function() { jbx.net.XHR.send(url, onNextCasoContent, 'POST', 'loaded='+encodeURIComponent(loaded)) }, 1000);
}

function onGetCasoContent(e) {
  var xhr = e.target,
      html = xhr+'',
      inner = null,
      parts = null,
      div = getDiv('layer_casos');
  // Obtener el título de la página e ingresar un registro en el history
  parts = html.match(/<title>([\s\S]+?)<\/title>/i);
  jbx.net.history.push(loading_caso_url, parts ? parts[1] : document.title+'', {type:'opencaso'});
  document.title = parts ? parts[1] : document.title+'';
  // Obtener el contenido
  inner = document.createElement('DIV');
  inner.className = 'caso-scroll';
  jbx.events.listen(inner, 'scroll', onCasoScroll, inner);  
  div.appendChild(inner);  
  $('header').addClass('force-small');
  setTimeout(function() { div.className = 'casos-layer'; }, 100); 
  setTimeout(function() {
	window['_HACK_USE_SCROLL_AOS_'] = 1;
	parts = html.match(/<main>([\s\S]+?)<\/main>/i);
	html = parts[1].replace(/<script>.+?<\/script>/ig, '');
    inner.innerHTML = html;
    jbx.dom.classes.add(div, 'loaded');
    $(div).scrollTop(0);    
    current_doc_top = $viewport.scrollTop();
    $('html, body').css('overflow', 'hidden');
    initCaso($(inner));
    inner = document.createElement('DIV');
    inner.className = 'button-back';
    jbx.events.listen(inner, 'click', closeCasosLayer);
    div.appendChild(inner);
    window['_HACK_USE_SCROLL_AOS_'] = null;    
  }, 1000);
}

function onNextCasoContent(e) {
  var xhr = e.target,
      html = xhr+'',
      parts = null,
      inner = null,
      el = null,
      url = loading_next_caso_div.getAttribute('data-next-url'),
      div = $('.caso-scroll')[0] || $('main')[0];
  // Quitar elementos de loader y footer del caso actual
  loading_next_caso_div.classList.add('shrink');
  el = $(loading_next_caso_div.parentNode).find('.footer-casos');
  el[0].classList.add('shrink');    
  // No agregar entrada al history, simplemente reemplazar la actual
  // NO FUNCA: el replace solo reemplaza el entry en el history, pero no 
  // modifica la URL mostrada. Además, me falta implementar el cambio en el
  // scroll up.
  parts = html.match(/<title>([\s\S]+?)<\/title>/i);
  /*jbx.net.history.replace(loading_caso_url, parts ? parts[1] : document.title+'', {type:'opencaso'});
  document.title = parts ? parts[1] : document.title+'';*/
  // Obtener el contenido  
  window['_HACK_USE_SCROLL_AOS_'] = 1;
  inner = document.createElement('DIV');
  parts = html.match(/<main>([\s\S]+?)<\/main>/i);
  html = parts[1].replace(/<script>.+?<\/script>/ig, '');
  inner.innerHTML = html;
  inner = inner.firstElementChild;
  div.appendChild(inner);
  var script = $(inner).find("script");
  initCaso($(inner));
  if (typeof script == 'object' && script.length > 0){
      $.each(script, function(){
          var tipo = $(this).attr("type");
          var src = $(this).attr("src");
          var html = $(this).html();
          tipo = tipo ? ' type="' + tipo + '"' : "";
          src = src ? ' src="' + src + '"' : "";
          html = html ? html : "";
          $("body").append('<script' + tipo + src + '>' + html + '</script>');
      });
      
  }
  window['_HACK_USE_SCROLL_AOS_'] = null;
  // Disparar el scroll pasado 1 segundo (esto es un desastre)
  //onCasoScroll.call(div.classList.contains('caso-scroll') ? div : window);
  setTimeout(function() { onCasoScroll.call(div.classList.contains('caso-scroll') ? div : window); }, 100);
  setTimeout(function() { onCasoScroll.call(div.classList.contains('caso-scroll') ? div : window); }, 500);
  setTimeout(function() { onCasoScroll.call(div.classList.contains('caso-scroll') ? div : window); loading_next_caso_div = null; }, 1000);
}

function onCasoScroll(e) {
  var target = this;
  // NOTA ANIBAL: AOS va ligado al scroll del documento y como estamos laburando
  // con un layer no nos va a dar bolas al escrolar.
  // Para esto hcie un hack en el script de AOS para que tome los valores de 
  // scroll que defino aquí en vez de tomar los del documento.
  // NO se, lo saque porque me armaba lio con los scrolls infinitos. 
  // Aparentement anda bien sin ese hack.
  /*window['_HACK_USE_SCROLL_AOS_'] = target.scrollTop;
  window['_HACK_USE_SCROLLH_AOS_'] = target.offsetHeight;
  window['_HACK_ELEMENT_OFFSET_'] = true;*/
  AOS.refresh();
  /*window['_HACK_USE_SCROLL_AOS_'] = null;
  window['_HACK_USE_SCROLLH_AOS_'] = null;
  window['_HACK_ELEMENT_OFFSET_'] = false;*/
  // No permitir que el botón de redes sociales exceda el tamaño del contenedor
  //caso_scroll_throttle && clearTimeout(caso_scroll_throttle);
  //caso_scroll_throttle = setTimeout(onCasoScrollThrottle, 10);
  onCasoScrollThrottle(target);
}

function onCasoScrollThrottle(target) {
  var casos = $('.caso-contenido');
  if (document_loaded) {
    casos.each(
      function(index) {
        var caso = $(this),
            social = caso.find('.share-button'),
            load_next = caso.find('.cargar-siguiente-caso'),
            footer = caso.find('.footer-casos'),
            bottom = footer[0].offsetHeight,
            scroll_bottom_pos = $(target).scrollTop() + $(target).height();
        load_next = load_next && load_next[0] ? load_next[0] : null;
        bottom += load_next ? load_next.offsetHeight : 0;
        // Posicionar botones de social
        if (scroll_bottom_pos > (caso[0].offsetTop + caso[0].offsetHeight - bottom)) {
          this.style.position = 'relative';
          social[0].style.position = 'absolute';
          social[0].style.bottom = (50 + bottom) + 'px';
          social[0].style.top = 'auto';
        } else 
        if (scroll_bottom_pos < caso[0].offsetTop+160) {
          this.style.position = 'relative';
          social[0].style.position = 'absolute';
          social[0].style.bottom = 'auto';                  
          social[0].style.top = '50px';
        } else {
          social[0].style.position = '';
          social[0].style.bottom = '';
          social[0].style.top = '';
        }
        // Ver si hay que cargar otro caso.
        if (!loading_next_caso_div && load_next && !load_next.classList.contains('active')) {
          if (scroll_bottom_pos > (load_next.offsetTop + caso[0].offsetTop + load_next.offsetHeight - 30)) {
            loading_next_caso_div = load_next; 
            openNextCaso(load_next);
          }
        }
      }
    );
  } 
}

// -----------------------------------------------------------------------------

function closeLayerWin() {
  var div = jbx.dom.getElement('layer_win');
  div && div.style.display != 'none' &&
  !jbx.net.history.push(root_path, null, {type:'closelayer'}) &&
  closeLayer();
  return false;
}

function openLayerLink(a) {
  if (!jbx.net.history.push(a.href+'', null, {type:'openlayer'})) {
    getLayerContent(a.href+'?xhr');
  }
  return false;
}

function closeLayer() {
  var div = jbx.dom.getElement('layer_win');
  if (div && div.style.display != 'none') {
    $('header').removeClass('force-small');
    $('header .hamburger').removeClass('is-active');
    $('html, body').css('overflow', 'visible');   
    $('html, body').scrollTop(current_doc_top);
    jbx.dom.classes.add(div, 'fade-out');
    setTimeout(function() { div.style.display = 'none'; }, 1000);
  } 
}

function getLayerContent(url, data) {
  $('header .hamburger').addClass('is-active');	
  var div = getDiv('layer_win');
  div.className = 'layer-win loading';
  div.style.display = 'block';
  div.innerHTML = '<table class="inner-table"><tr><td class="inner-td"><table class="loader"><tr><td><img src="assets/gfx/loading-e.gif" width="90" height="93" /><div></td></tr></table></td></tr></table>';
  jbx.net.XHR.send(url, onGetLayerContent);
}

function onGetLayerContent(e) {
  var xhr = e.target,
      html = xhr+'',
      inner = null,
      div = getDiv('layer_win');
      console.log(xhr);
      console.log(html);
  inner = document.createElement('DIV');
  inner.className = 'layer-scroll';
  jbx.events.listen(inner, 'scroll', onCasoScroll, inner);  
  div.appendChild(inner);  
  $('header').addClass('force-small');
  setTimeout(function() { div.className = 'layer-win'; }, 100); 
  setTimeout(function() {
	window['_HACK_USE_SCROLL_AOS_'] = 1;
    inner.innerHTML = '<div class="layer-contenido">'+html+'</div>';
    current_doc_top = $viewport.scrollTop();
    jbx.dom.classes.add(div, 'loaded');
    $(div).scrollTop(0);
    $('html, body').css('overflow', 'hidden');    
    div.appendChild(inner); 
    initCaso($(inner));    
    window['_HACK_USE_SCROLL_AOS_'] = null;    
  }, 1000);
}

// -----------------------------------------------------------------------------

function seleccionarArchivo(f) {
  var label = jbx.dom.nextElement(f);
  label.innerHTML = f.value
  label.style.color = '#000';
}

function enviarFormulario(form) {
  var j = 0,
      xhr = null,
      type = '',
      value = null,
      post = [],
      files = [],
      buttons = [],
      inputs = $(form).find('input, select, textarea, button');
  inputs.each(function(i, inp) {
    type = inp.type && inp.type.toLowerCase();
    if (inp.nodeName == 'BUTTON' || (inp.nodeName == 'INPUT' && (type == 'button' || type == 'submit' || type == 'image'))) {
      buttons.push(inp);      
    }
    if (inp.name) {
      switch (inp.nodeName) {
        case 'TEXTAREA':
          post.push(inp.name+'='+encodeURIComponent(inp.value));
          break;
        case 'INPUT':
          if (type == 'checkbox' || type == 'radio') {
            inp.checked && post.push(inp.name+'='+encodeURIComponent(inp.value));
          } else
          if (type != 'button' && type != 'submit' && type != 'image') {
            type == 'file' ? files.push(inp) : post.push(inp.name+'='+encodeURIComponent(inp.value));
          }
          break;
        case 'SELECT':
          value = [];
          for (j=0; j<inp.options.length; j++) {
            inp.options[j].selected && value.push(inp.options[j].value);
          }
          if (value.length > 1) {
            for (j=0; j<value.length; j++) {
              post.push(inp.name+'[]='+encodeURIComponent(value[j]));
            }
          } else {
            post.push(inp.name+'='+encodeURIComponent(value[0] || ''));
          }
          break;
      }
    }
  });
  formProgressMessage(form, 'Enviando mensaje, por favor espere', 'width:0px;padding:0px');  
  xhr = new jbx.net.XHR();
  xhr.listen([jbx.events.Event.PROGRESS, jbx.events.Event.COMPLETE, jbx.events.Event.READY], onFormEvent);
  xhr.send(form.action, 'POST', post.join('&'), files);
  xhr['formulario'] = form;
  for (i=0; i<buttons.length;i++) {
    buttons[i].disabled = true;
  }
  return false;
}

function formWait(f, time) {
  var div = null,
      lastbtn = null,
      btns = $(f).find('button');
  btns.each(function(i, btn) {
    btn.disabled = time > 0;
    lastbtn = btn;
  });
  if (lastbtn && time > 0) {
    div = jbx.dom.previousElement(lastbtn);
    if (!div || div.className != 'button-wait') {
      div = document.createElement('DIV');
      div.className = 'button-wait';
      lastbtn.parentNode.insertBefore(div, lastbtn);
    }
    div.style.display = 'block';
    div.innerHTML = time;
    setTimeout(function() { formWaitTick(div, lastbtn, time); }, 1000);
  }
}

function formWaitTick(div, btn, time) {
  time--;
  div.innerHTML = time;
  if (time <= 0) {
    btn.disabled = false;
    div.style.display = 'none';
  } else {
    btn.disabled = true;
    setTimeout(function() { formWaitTick(div, btn, time); }, 1000);
  }
}

function formClear(f) {
  var el = null,
      inps = $(f).find('input', 'textarea');
  inps.each(function(i, inp) {
    //if (inp.nodeName == 'INPUT' && inp.type == 'file') {
      /*el = document.createElement('DIV');
      div.innerHTML = '<input type="file" name="archivo" id="archivo" required="required" onchange="seleccionarArchivo(this)" autocomplete="off" />';
      el = jbx.dom.firstChild(el);
      inp.parentNode.insertBefore(el, inp);
      inp.parentNode.removeChild(inp);*/
    //} else 
    if (inp.type != 'hidden') {
      inp.value = '';
      inp.innerHTML = '';
    }
  });
}

function formProgressMessage(f, msg, s) {
  var div = jbx.dom.lastChild(f);
  if (!div || div.className != 'progress-bar') {
    div = document.createElement('DIV');
    div.className = 'progress-bar';
    f.appendChild(div);
  }
  div.innerHTML = '<div class="bar" style="'+s+'">'+msg+'</div><div class="text">'+msg+'</div>';
  div.style.display = 'block';
}

function formComplete(f, resp) {
  
  var error = false,
      enablebtn = true,
      div = jbx.dom.firstChild(f);
  if (!div || div.className != 'mensaje') {
    div = document.createElement('DIV');
    div.className = 'mensaje';
    f.insertBefore(div, jbx.dom.firstChild(f));
  }
  if ((/<b>Warning<\/b>:  POST Content-Length of/).test(resp)) {
    div.innerHTML = '<div style="width:100%;height:100%" onclick="cerrarMensaje(this)"><div class="x" onclick="cerrarMensaje(this)">&times;</div><table><tr><td><b style="color:#e00">ARCHIVO DEMASIADO GRANDE</b> El archivo enviado es demasiado grande.</td></tr></table></div>';
  } else {
    try {
  
      resp = jbx.net.json.parse(resp);
      
      if (resp.error) {
        div.innerHTML = '<div style="width:100%;height:100%" onclick="cerrarMensaje(this)"><div class="x" onclick="cerrarMensaje(this)">&times;</div><table><tr><td><b style="color:#e00">CORRIJA LOS SIGUIENTES ERRORES</b> '+resp.error+'</td></tr></table></div>';  
      } else 
      if (resp.ok > 0) {
        div.innerHTML = '<div style="width:100%;height:100%" onclick="cerrarMensaje(this)"><div class="x">&times;</div><table><tr><td><b style="color:#000">¡RECIBIMOS TU MENSAJE!</b> Gracias por visitar nuestra página</td></tr></table></div>';
        formClear(f);
      } else {
        error = true;
      }
      resp.wait > 0 && formWait(f, resp.wait);
      enablebtn = resp.wait <= 0;
    } catch (e) {
      
      error = true;
	  
    } 
    if (error) {
      div.innerHTML = '<div style="width:100%;height:100%" onclick="cerrarMensaje(this)"><div class="x" onclick="cerrarMensaje(this)">&times;</div><table><tr><td><b style="color:#e00">RESPUESTA INCORRECTA</b> La respuesta del servidor no fue la esperada por la aplicación.<br />Intente nuevamente.</td></tr></table></div>';
   	}    
  }
  div.style.display = 'block';
  return enablebtn;
}

function cerrarMensaje(btn) {
  var f = btn.parentNode.parentNode;
  btn.parentNode.style.display = 'none';
}

function onFormEvent(e) {

  var p = 0, 
      el = null,
      xhr = e.target,

      f = xhr['formulario'];
  if (e.type == jbx.events.Event.PROGRESS) {
    if (xhr.total > 0) {
      p = Math.round(xhr.loaded / xhr.total * 100)+'%';
      formProgressMessage(f, 'Enviando '+p, 'width:'+p);
    } else {
      formProgressMessage(f, 'Enviando mensaje, por favor espere', 'width:0px;padding:0px');
    }
  } else
  if (e.type == jbx.events.Event.COMPLETE) {

    xhr['enable_buttons'] = formComplete(f, xhr+'');
  } else
  if (e.type == jbx.events.Event.READY) {
    if (xhr['enable_buttons']) {
      el = $(xhr['formulario']).find('button');
      el.each(function(i, e) { e.disabled = false });
    }
    xhr['enable_buttons'] = true;
    el = jbx.dom.lastChild(xhr['formulario']);
    if (el && el.className == 'progress-bar') {
      el.style.display = 'none';
    }
    xhr['formulario'] = null;    
  }
}

// -----------------------------------------------------------------------------

function getSections() {
  var el = null,
      offy = 0,
      height = 0,
      boffset = 0,      
      secs = null;
  if (!sections.length) {
    secs = $('main section');
    boffset = parseInt($('.mainoffy').height(),10);
    secs.each(
      function(i, s) {
        el = $(s);
        height = parseInt(el.outerHeight(),10);        
        sections.push({
          height:height,
          offsettop:offy+boffset,          
          offsetbottom:offy,
          nextsection:offy+height,
          prevsection:offy+boffset,
          name:s.getAttribute('data-section'),
          element:el
        });
        offy += height;
      }    
    );    
  }
}

function getKeyframes() {
  var offy = {},
      height = 0,
      section = '',
      frames = $('.keyframes div');
  frames.each(
    function(i, f) {
      height = parseInt(f.style.height, 10);
      section = f.parentNode.parentNode.getAttribute('data-section');
      keyframes[section] = keyframes[section] || [];
      offy[section] = offy[section] || 0;      
      current_keyframe[section] = -1; 
      keyframes[section].push({
        height:height,
        offsety:offy[section],
        nextframe:offy[section]+height,
        keyframe:keyframes[section].length,
        section:section,
        number:parseInt(f.getAttribute('data-number'), 10),
        element:$(f.parentNode.parentNode)
      });
      offy[section] += height;
    }    
  );
}

function getScrollTracks() {
  var height = 0,
      tracks = null,
      body_bounds = 0;
  if (!scroll_tracks.length) {
    tracks = $('[data-scroll-track]');
    body_bounds = parseInt($('.mainoffy').height(),10);
    tracks.each(
      function(i, el) {
        el = $(el);  
        scroll_tracks.push({
          name:el[0].getAttribute('data-scroll-track'),
          height:parseInt(el.outerHeight(), 10),
          offsety:parseInt(el.offset().top, 10),
          bounds:body_bounds,
          element:el,
          display:false
        });
      }
    );    
  }
}

// -----------------------------------------------------------------------------

function setSection(secnumber) {
  var nsec = sections[secnumber],
      osec = sections[current_section];
  if (nsec && secnumber != current_section) {
    osec && osec.element.removeClass('active');
    nsec.element.addClass('active');
    current_section = secnumber;
    onSectionChange(nsec);
  }
}

function setKeyframe(sec, kfnumber) {
  var ckf = current_keyframe[sec.name],
      kfs = keyframes[sec.name],
      kfn = kfs && kfs[kfnumber],
      kfo = kfs && kfs[ckf];
  if (kfn && kfnumber != ckf) {
    kfo && kfo.element.removeClass('kf'+kfo.number);
    kfn.element.addClass('kf'+kfn.number);
    current_keyframe[sec.name] = kfnumber;
    onKeyframeChange(sec, kfn);
  }
}

function goToFrame(sec, num) {
  var i = 0,
      kf = null,
      len = keyframes[sec].length;
  for (i=0; i<len; i++) {
    kf = keyframes[sec][i];
    if (kf.section == sec && kf.number == num) {
      setKeyframe(kf.keyframe-50);
      $viewport.scrollTop(kf.nextframe-50);
    }
  }
  return false;
}

// -----------------------------------------------------------------------------

function onDocumentResize() {
  sections = [];
  scroll_tracks = [];
}

function onDocumentScroll() {
  var y = $viewport.scrollTop(),
      dir = y >= current_y ? 1 : 0;
  onDocumentScrollSection(y, dir);
  onDocumentScrollKeyframe(y, dir);
  onTrackElements(y, dir);
  current_y = y;
}

function onTrackElements(y, dir) {
  var t = null;
  getScrollTracks();
  for (i=0; i<scroll_tracks.length; i++) {
    t = scroll_tracks[i];
    if (dir > 0) {
      if (y > t.offsety+t.height) {
        t.display && onTrackElementLeave(t);
        t.display = false;
      } else      
      if (y+t.bounds > t.offsety) {
        !t.display && onTrackElementEnter(t);
        t.display = true;
      }
    } else {
      if (y+t.bounds < t.offsety) {
        t.display && onTrackElementLeave(t);
        t.display = false;
      } else
      if (y < t.offsety+t.height) {
        !t.display && onTrackElementEnter(t);
        t.display = true;
      }      
    }
  }
}

function onDocumentScrollKeyframe(y, dir) {
  var sec = sections[current_section],
      kfn = sec && current_keyframe[sec.name],
      kfs = sec && keyframes && keyframes[sec.name],
      ckf = kfs && kfs[kfn];
  if (sec && kfs) {    
    while (ckf && y > sec.offsetbottom+ckf.nextframe) {
      kfn++;
      ckf = kfs[kfn];
    }
    if (!ckf) {
      kfn = kfs.length-1;
      ckf = kfs[kfn]; 
    }
    while (ckf && y < sec.offsetbottom+ckf.offsety) {
      kfn--;
      ckf = kfs[kfn];
    }
    if (!ckf) {
      kfn = 0;
      ckf = kfs[kfn]; 
    }
    if (kfn != current_keyframe[sec.name]) {
      setKeyframe(sec, kfn);
    }
  }
}

function onDocumentScrollSection(y, dir) {
  var csec = null,
      secn = current_section;
  getSections();
  csec = sections[secn];  
  if (dir > 0) {
    while (csec && y < csec.offsetbottom) {
      secn--;
      csec = sections[secn];
    }
    if (!csec) {
      secn = 0;
      csec = sections[secn];
    }    
    while (csec && y > csec.nextsection) {
      secn++;
      csec = sections[secn];
    }
    if (!csec) {
      secn = sections.length-1;
      csec = sections[secn];
    }  
  } else {
    while (csec && y < csec.offsettop) {
      secn--;
      csec = sections[secn];
    }
    if (!csec) {
      secn = 0;
      csec = sections[secn];
    }
  }
  if (secn != current_section) {
    setSection(secn);
  }
}

function onKeyframeChange(sec, kf) {
  if (sec.name == 'welcome') {
    $('.mouse')[kf.number == 1 ? 'removeClass' : 'addClass']('hide');
  }
}

// Agrega clase 'small' al header al cambiar de sección
// Mejor que a los XX px de scroll se agregue la clase

function onSectionChange(sec) {
  var y = 0;
  $('header')[sec.name == 'welcome' ? 'removeClass' : 'addClass']('small');
  $('.button-top')[sec.name == 'welcome' ? 'removeClass' : 'addClass']('show');
}


$(function() {
    var header = $("header");
    $(window).scroll(function() {
        var scroll = $(window).scrollTop();
        if (scroll >= 400) {
            header.addClass("small");
        } else {
            header.removeClass("small");
        }
    });
});

function onTrackElementEnter(el) {
  var timer = jbx.math.random(100, 500);
  // Por ahora solo hay animaciones asi que no consultar el elemento.
  // Si se llegara a agregar otro item habrá que consultar de que elemento se
  // trata.
  el.element.addClass('iniciar');
  // Animar imagenes de casos
  if (el.element[0].nodeName == 'FIGURE' && !jbx.dom.classes.has(el.element[0], 'visible')) {
    setTimeout(function() { el.element.addClass('visible') }, timer);
  }
  // Si es el slide del video, reanudar la reproducción
  if (el.name == 'home-video') {
	  document.getElementById('video-full').play();
  }  
}

function onTrackElementLeave(el) {
  el.element.removeClass('iniciar');
  // Si estamos saliendo del slide principal, detener el video para que no sea
  // tan pesada la pagina con el resto de las animaciones.
  if (el.name == 'home-video') {
	  document.getElementById('video-full').pause();
  }
}

// -----------------------------------------------------------------------------

function onHistoryNavigate(type, data) {
  var type = data && data.type;
  // Como el initial state se supone que es el home tomamos como default el tipo
  // closecaso, de forma que al presionar back hasta el initial state se cierre
  // cualquier caso que se encuentre abierto.
  switch (type) {
    // Que no haga nada, ahora el history push se hace luego de la petición AJAX
    // para poder definir el título de la página.
    case 'opencaso': break;
    case 'openlayer': getLayerContent(document.location+'?xhr', data); break;
    default: closeCaso(); closeLayer(); break;
  }
}

function onGalleryMouseOut(e) {
  e.currentTarget.removeAttribute('data-mouse-over');
}

function onGalleryMouseOver(e) {
  e.currentTarget.setAttribute('data-mouse-over', 'over');
}

function inicializarFunciones(){
  AOS.init({
      duration: 750,
      easing: 'ease-in-out-quad',
      delay: 200,
  });
  $('.menu-full-screen .menu-link').on('click', function(e) {
	$hamburger.toggleClass("is-active");
	$('.menu-full-screen').toggleClass("active");
	scrollToElement($('#'+(e.currentTarget.href+'').split('#').pop()), 70);
	e.preventDefault();
  });
  var $hamburger = $(".hamburger");
  $hamburger.on("click", function(e) {
    if ($hamburger.hasClass('is-active')) {
  	  $hamburger.removeClass("is-active");
      $('.menu-full-screen').removeClass("active");
      closeCasosLayer();
      closeLayerWin();
    } else {
	  $hamburger.addClass("is-active");
      $('.menu-full-screen').addClass("active")    	    	
    }
  });
}

function copyToClipboard(element) {
  var $temp = $("<input>");
  $("body").append($temp);
  $temp.val(element).select();
  document.execCommand("copy");
  $temp.remove();
  $(".mensaje-copiado").addClass("magia");
  setTimeout(function(){$(".mensaje-copiado").removeClass("magia");},5000);

}


//async function alternarImagenes() {
//    var cantidadElementos = 16; //NUMERO PAR
//    var delay = 500;
//
//    var num = parseFloat("0." + cantidadElementos.toString());
//    var randomElements = $("#grillaclientes figure").get().sort(function () {
//        return Math.round(Math.random()) - num
//    }).slice(0, cantidadElementos);
//
//
//    for (var i = 0; i < cantidadElementos - 1; i = i + 2) {
//       
//            var elemento1 = randomElements[i];
//            var elemento2 = randomElements[i + 1];
//
//            var img1 = $(elemento1).find("img").attr("src");
//            var img2 = $(elemento2).find("img").attr("src");
//
//            $(elemento1).find("img").animate({ opacity: 0 }, delay, function () {
//                $(elemento1).find("img").attr("src", img2);
//                $(elemento1).find("img").animate({ opacity: 1 }, delay);
//            });
//            $(elemento2).find("img").animate({ opacity: 0 }, delay, function () {
//                $(elemento2).find("img").attr("src", img1);
//                $(elemento2).find("img").animate({ opacity: 1 }, delay);
//            });
//
//            await sleep(delay * 2);
//    }
//
//    alternarImagenes();
//
//}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



$(document).ready(function(){
    
    var RevealContent = (function() {
    var servicioRevealElements;

    servicioRevealElements = $("#serviciosEllecktra .reveal");
    console.log(servicioRevealElements);

      /**Boton cierre de modal */

  $("#btn-cerrar").on("click", function(){
    
    var video = $("#playerid").attr("src");
    $("#playerid").attr("src","");
    //$("#playerid").attr("src",video);
  })
  

    function servicioReveal() {
        //console.log("paso 2");
        for (var i = 0; i < servicioRevealElements.length; i++) {
            new ScrollMagic.Scene({
                    triggerElement: servicioRevealElements[i],
                    offset: 150,
                    triggerHook: 0.9,
                })
                .setClassToggle(servicioRevealElements[i], "visible")
                .addTo(controllerRevealContent)
                .reverse(false);
        }
    }


    function init() {
       //console.log("paso");
        controllerRevealContent = new ScrollMagic.Controller();
        servicioReveal();
    }

    return {        
        revealContent: init        
    }
})();
    
    
    
    RevealContent.revealContent();
})