(function(){
  'use strict';

  var panel=document.getElementById('dmf-manufacturing-proof');
  if(!panel)return;

  var status=panel.querySelector('[data-dmf-proof-status]');
  var proof=null;
  var state='checking';
  var labels={
    es:{checking:'Verificando evidencia',verified:'CI verificado',unavailable:'Evidencia no disponible'},
    en:{checking:'Verifying evidence',verified:'CI verified',unavailable:'Evidence unavailable'},
    zh:{checking:'正在验证证据',verified:'CI 已验证',unavailable:'证据不可用'}
  };

  function language(){
    var lang=(document.documentElement.lang||'es').toLowerCase();
    return lang.indexOf('zh')===0?'zh':lang.indexOf('en')===0?'en':'es';
  }

  function setStatus(next){
    state=next;
    status.textContent=labels[language()][state];
    status.removeAttribute('data-i');
    panel.classList.toggle('is-verified',state==='verified');
  }

  function valid(data){
    return data&&data.pass===true&&data.watertight===true&&
      data.sealedCavityCount===0&&data.drainReachableVolumePct===100&&
      data.hollowReductionPct>=50&&
      data.fidelityP95MM<=data.fidelityThresholdP95MM&&
      data.removedPct<=data.removedThresholdPct&&
      data.threemfSHA256==='ca896af51d718b2586a93c29515d59f8f72d3b60d294e1359f19d1db33c1ae82';
  }

  function number(value,digits){
    return new Intl.NumberFormat(language(),{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
  }

  function render(data){
    var values={
      hollowReductionPct:number(data.hollowReductionPct,1)+'%',
      sealedCavityCount:String(data.sealedCavityCount),
      drainReachableVolumePct:number(data.drainReachableVolumePct,0)+'%',
      fidelityP95MM:number(data.fidelityP95MM,3)+' mm'
    };
    Object.keys(values).forEach(function(key){
      var node=panel.querySelector('[data-dmf-proof="'+key+'"]');
      if(node)node.textContent=values[key];
    });
  }

  fetch('/assets/dmf-manufacturing-proof.json',{cache:'no-store',credentials:'same-origin'})
    .then(function(response){if(!response.ok)throw new Error('proof '+response.status);return response.json();})
    .then(function(data){
      if(!valid(data))throw new Error('invalid manufacturing proof');
      proof=data;
      render(data);
      setStatus('verified');
      document.documentElement.dataset.dmfManufacturing='verified';
      window.dispatchEvent(new CustomEvent('dmf_manufacturing_proof',{detail:{verified:true,watertight:true,drainReachableVolumePct:data.drainReachableVolumePct,fidelityP95MM:data.fidelityP95MM}}));
    })
    .catch(function(){
      setStatus('unavailable');
      document.documentElement.dataset.dmfManufacturing='unavailable';
    });

  new MutationObserver(function(mutations){
    if(mutations.some(function(item){return item.attributeName==='lang';})){
      if(proof)render(proof);
      setStatus(state);
    }
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  var cta=document.querySelector('[data-dmf-print-cta]');
  if(cta)cta.addEventListener('click',function(){
    var detail={cta:cta.dataset.dmfPrintCta||'',destination:cta.href,proof:state};
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({event:'dmf_print_master_cta',dmf_cta:detail.cta,dmf_destination:detail.destination,dmf_proof:detail.proof});
    document.documentElement.dataset.dmfLastPrintCta=detail.cta;
    window.dispatchEvent(new CustomEvent('dmf_print_master_cta',{detail:detail}));
  });
})();
