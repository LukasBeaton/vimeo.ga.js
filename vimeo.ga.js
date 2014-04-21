/*!
 * vimeo.ga.js | v1.0
 *
 * Based on the library created by:
 * Copyright (c) 2012 - 2013 Sander Heilbron (http://sanderheilbron.nl)
 * MIT licensed
 *
 * Updated by: Lukas Beaton on April 21, 2014
 * Description: Support was added for multiple vimeos on a page. The code was also refactored so that it is properly namespaced without globals.
 */
 
var VimeoGA = {
  iframes : [],
  gatype : 0,// init the gatype variable
  progressMarker : {},

  init : function(){
    VimeoGA.iframes = $('iframe');

    $.each(VimeoGA.iframes, function(index, iframe) {
      var iframeId = $(iframe).attr('id');

      VimeoGA.progressMarker[iframeId] = {
        'progress25' : false,
        'progress50' : false,
        'progress75' : false,
        'videoPlayed' : false,
        'videoPaused' : false,
        'videoSeeking' : false,
        'videoCompleted' : false,
        'timePercentComplete' : 0
      }
    });

    // used for debugging
    //console.log("Loading Vimeo Tracker...");
  
    if ( typeof(_gaq) != 'undefined' ) {
      VimeoGA.gatype = 1; // ga.js
    } else if ( typeof(window.ga) != 'undefined' ) {
      VimeoGA.gatype = 2; // analytics.js
    }

    if (VimeoGA.gatype == 0) {
      return; // Google Analytics not found
    }

    // Listen for messages from the player
    if (window.addEventListener) {
      window.addEventListener('message', VimeoGA._onMessageReceived, false);
    } else {
      window.attachEvent('onmessage', VimeoGA._onMessageReceived, false);
    }
  },


  // Handle messages received from the player
  _onMessageReceived : function(e) {
    if (e.origin !== "http://player.vimeo.com" && e.origin !== "https://player.vimeo.com") {
      return;
    }
  
    var data = JSON.parse(e.data),
        iframeEl = $("#"+data.player_id),
        iframeId = iframeEl.attr('id');

    // used for debugging
    //console.log("Here is the data...")
    //console.log(data)

    switch (data.event) {
      case 'ready':
        VimeoGA._onReady();
        break;
      case 'playProgress':
        VimeoGA._onPlayProgress(data.data, iframeEl);
        break;
      case 'seek':
        if (iframeEl.data('seek') && !VimeoGA.progressMarker[iframeId]['videoSeeking']) {
          VimeoGA._trackEvent(iframeEl, 'Skipped video forward or backward')
          VimeoGA.progressMarker[iframeId]['videoSeeking'] = true; // Avoid subsequent seek trackings
        }
        break;
      case 'play':
        if (!VimeoGA.progressMarker[iframeId]['videoPlayed']) {
          VimeoGA._trackEvent(iframeEl, 'Started video')
          VimeoGA.progressMarker[iframeId]['videoPlayed'] = true; // Avoid subsequent play trackings
        }
        break;
      case 'pause':
        VimeoGA._onPause(iframeEl);
        break;
      case 'finish':
        if (!VimeoGA.progressMarker[iframeId]['videoCompleted']) {
          VimeoGA._trackEvent(iframeEl, 'Completed video')
          VimeoGA.progressMarker[iframeId]['videoCompleted'] = true; // Avoid subsequent finish trackings
        }
        break;
    }//end switch
  },

  // Helper function for sending a message to the player
  _post : function(action, value, iframe){
    var data = {
        method: action
    };

    if (value) {
        data.value = value;
    }

    var iframeSrc = $(iframe).attr('src').split('?')[0];
    iframe.contentWindow.postMessage(JSON.stringify(data), iframeSrc);
  },

  _onReady : function() {
    $.each(VimeoGA.iframes, function(index, iframe) {
      VimeoGA._post('addEventListener', 'play', iframe);
      VimeoGA._post('addEventListener', 'seek', iframe);
      VimeoGA._post('addEventListener', 'pause', iframe);
      VimeoGA._post('addEventListener', 'finish', iframe);
      VimeoGA._post('addEventListener', 'playProgress', iframe);
    })
  },
  
  _onPause : function(iframeEl) {
    var iframeId = iframeEl.attr('id');

    if (VimeoGA.progressMarker[iframeId]['timePercentComplete'] < 99 && !VimeoGA.progressMarker[iframeId]['videoPaused']) {
      VimeoGA._trackEvent(iframeEl, 'Paused video')
      VimeoGA.progressMarker[iframeId]['videoPaused'] = true; // Avoid subsequent pause trackings
    }
  },

  // Tracking video progress 
  _onPlayProgress : function(data, iframeEl) {
    var progress,
        iframeId = iframeEl.attr('id');

    VimeoGA.progressMarker[iframeId]['timePercentComplete'] = Math.round((data.percent) * 100); // Round to a whole number
    
    if (!iframeEl.data('progress')) {
      return;
    }
    
    if (VimeoGA.progressMarker[iframeId]['timePercentComplete'] > 24 && !VimeoGA.progressMarker[iframeId]['progress25']) {
      progress = 'Played video: 25%';
      VimeoGA.progressMarker[iframeId]['progress25'] = true;
    }

    if (VimeoGA.progressMarker[iframeId]['timePercentComplete'] > 49 && !VimeoGA.progressMarker[iframeId]['progress50']) {
      progress = 'Played video: 50%';
      VimeoGA.progressMarker[iframeId]['progress50'] = true;
    }

    if (VimeoGA.progressMarker[iframeId]['timePercentComplete'] > 74 && !VimeoGA.progressMarker[iframeId]['progress75']) {
      progress = 'Played video: 75%';
      VimeoGA.progressMarker[iframeId]['progress75'] = true;
    }
    
    if (progress) {
      VimeoGA._trackEvent(iframeEl, progress)
    }
  },

  _trackEvent : function(iframeEl, progress){
    var iframeSrc = iframeEl.attr('src').split('?')[0],
        vimeoName = iframeEl.attr('vimeo-name'),
        eventCategory = "Vimeo: "+vimeoName+" "+iframeEl.data('ga-identifier');

    if ( VimeoGA.gatype == 1 ) {
      _gaq.push(['_trackEvent', eventCategory, progress, iframeSrc, undefined, true]);
    } else if ( VimeoGA.gatype == 2 ) {
      ga('send', 'event', eventCategory, progress, iframeSrc);
    }
  }
};

$(function(){
  VimeoGA.init();  
});
