import { useRef, useEffect, useCallback } from 'preact/hooks'
import styles from './Preview.module.css'
import { patchStore,getStore } from '../lib/state.ts'
import CenterToFitIcon from '../ui/CenterToFitIcon.tsx'
import Button from '../ui/Button.tsx'
import type { Point } from '../lib/drawingToolkit/index.js'
import lineclip from '../lib/lineclip.ts'

import { createListener } from '../lib/createListener.js'

export default function Preview(props: { className?: string }) {
  const { turtles, docDimensions } = getStore()
 //  patchStore({ debounce })
 // patchStore({ debounce: false })

  useEffect(init, [])
  let animation_speed = getStore()

  useEffect(() => {
    const canvas = document.querySelector('.main-canvas')
    requestRedraw(canvas,true)
  })
  let speed = 50;

  return (
    <div class={styles.root}>
      <canvas class={`${styles.canvas} main-canvas`} />
      <div class={`${styles.mousePosition} mouse-position`} />
      <Button
        class={`${styles.centerButton} center-view-trigger`}
        variant="ghost"
        icon
        aria-label="center document in view">
        <CenterToFitIcon />
      </Button>
      <input type="range" min="1" max="100" value={animation_speed} class="slider" id="myRange" onChange={()=>{
        patchStore(animation_speed)
      }}>
      </input>
    </div>
  )
}

function init() {
  const canvas = document.querySelector('.main-canvas')

  const bodyListener = createListener(document.body)
  const canvasListener = createListener(canvas)

  // center view
  const { docDimensions } = getStore()

  const br = canvas.getBoundingClientRect()
  panZoomParams.scale = Math.min(
    (br.width - 20) / docDimensions.width,
    (br.height - 20) / docDimensions.height
  )

  panZoomParams.panX =
    br.width / 2 - (docDimensions.width * panZoomParams.scale) / 2
  panZoomParams.panY =
    br.height / 2 + (docDimensions.height * panZoomParams.scale) / 2

  requestRedraw(canvas,true)

  canvasListener(
    'wheel',
    '',
    (e: WheelEvent) => {
      e.preventDefault()

      const ZOOM_SPEED = 0.0005

      const { panX, panY, scale } = panZoomParams

      // const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale + e.deltaY * -ZOOM_SPEED));
      const newScale = scale + scale * (-e.deltaY * ZOOM_SPEED)

      const br = canvas.getBoundingClientRect()
      const fixedPoint = { x: e.clientX - br.left, y: e.clientY - br.top }
      panZoomParams.panX =
        fixedPoint.x + (newScale / scale) * (panX - fixedPoint.x)
      panZoomParams.panY =
        fixedPoint.y + (newScale / scale) * (panY - fixedPoint.y)
      panZoomParams.scale = newScale
      patchStore({override:true})
      requestRedraw(canvas)
    },
    { passive: false }
  )

  let mousedown = false
  canvasListener('mousedown', '', e => {
    mousedown = true
  })

  canvasListener('mouseup', '', e => {
    mousedown = false
  })

  canvasListener('mousemove', '', (e: MouseEvent) => {
    // update mousepos
    const mousePos = document.querySelector('.mouse-position') // mousePosRef.current;

    if (mousePos) {
      // convert mouse pos to virtual coords (accounting for zoom, scale)

      const { panX, panY, scale } = panZoomParams
      const br = canvas.getBoundingClientRect()
      let x = e.clientX - br.left
      x = (x - panX) / scale
      let y = e.clientY - br.top
      y = -(y - panY) / scale
      const addPadding = (s: string) => (s.startsWith('-') ? s : ' ' + s)
      mousePos.textContent = `${addPadding(x.toFixed(1))}mm, ${addPadding(
        y.toFixed(1)
      )}mm`
    }

    if (e.buttons !== 1 || !mousedown) return
    e.preventDefault()

    panZoomParams.panX += e.movementX
    panZoomParams.panY += e.movementY
    patchStore({override:true})
    requestRedraw(canvas)
  })

  bodyListener('click', '', e => {
    // check if contained in element with this selector string
    if (!e.target.closest('.center-view-trigger')) return

    const { docDimensions } = getStore()

    if (!canvas) return

    const br = canvas.getBoundingClientRect()
    panZoomParams.scale = Math.min(
      (br.width - 20) / docDimensions.width,
      (br.height - 20) / docDimensions.height
    )

    panZoomParams.panX =
      br.width / 2 - (docDimensions.width * panZoomParams.scale) / 2
    panZoomParams.panY =
      br.height / 2 + (docDimensions.height * panZoomParams.scale) / 2
      patchStore({override:true})
    requestRedraw(canvas)
  })

  const resizeObserver = new ResizeObserver(entries => {
    const { width, height } = entries[0].contentRect
    dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    setCtxProperties() // setting width/height clears ctx state
    patchStore({override:true})

    requestRedraw(canvas)
  })

  resizeObserver.observe(canvas)
}

// drawing function

const panZoomParams = {
  panX: 0,
  panY: 0,
  scale: 1
}

let dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

const requestRedraw = (canvas: HTMLCanvasElement,animation = false) => {
  requestAnimationFrame(() => {
    
    _redraw(canvas,animation)
  
  })
}

let _ctx: CanvasRenderingContext2D | null = null

const setCtxProperties = () => {
  if (!_ctx) return

  _ctx!.lineWidth = 1
  _ctx!.lineJoin = 'round'
  _ctx!.lineCap = 'round'
}
const getCtx = (canvas: HTMLCanvasElement) => {
  if (!_ctx) {
    _ctx = canvas.getContext('2d')
    setCtxProperties()
  }
  return _ctx!
}

const _redraw = (canvas: HTMLCanvasElement,animation = false) => {
  const {
    turtlePos,
    animate,
    turtles,
    turtles_animated,
    override,
    animation_speed,
    docDimensions: { width: docW, height: docH }
  } = getStore()
  console.log(animate)
  console.log(animation)
  console.log('override',override)
  
  if (!canvas || !turtlePos || (!animate&&!override)) return
  patchStore({override: false})
  
 // patchStore({ debounce: true })
  //patchStore({animate:false})
  //animation: Should the animation run
  //animate: is there not a animation currently runing
  //override: if run is clicked, or if the numer is adjusted,  run redraw
  //TODO: implement override


  // we want to only work in virtual pixels, and just deal with device pixels in rendering
  const width = canvas.width /* / dpr*/
  const height = canvas.height /* / dpr*/

  // turtle canvas
  const ctx = getCtx(canvas)

  ctx.clearRect(0, 0, width, height)

  // DRAW TURTLE
  // ctx.beginPath();
  // ctx.arc(
  //     dpr * (panZoomParams.panX + turtlePos[0] * panZoomParams.scale),
  //     dpr * (panZoomParams.panY + (-1 * turtlePos[1]) * panZoomParams.scale),
  //     dpr * 7,
  //     0,
  //     2 * Math.PI
  // );
  // ctx.strokeStyle = "white";
  // ctx.stroke();
  // ctx.fillStyle = "#ffa500";
  // ctx.fill();

  // draw document

  ctx.strokeStyle = '#3333ee'

  ctx.strokeRect(
    dpr * panZoomParams.panX,
    dpr * panZoomParams.panY,
    dpr * docW * panZoomParams.scale,
    -dpr * docH * panZoomParams.scale
  )

  // draw turtles

  // turtle path
  // if(turtles.length === 0) return;
  const { panX, panY, scale } = panZoomParams
  let j = 0;
  if(!animation||!animate){
    for (const turtle of turtles) {
   
      ctx.beginPath()
  
      for (const polyline of turtle.path) {
        // let paths = polyline.map(([x, y]) => [
        //   dpr * (panX + x * scale),
        //   -(dpr * (-panY + y * scale))
        // ])
  
        // paths = lineclip(paths, [0, 0, width, height])
  
        polyline.forEach((p, i) => {
         //if(!animate && !animation)
            let [x, y] = p
            x = dpr * (panX + x * scale)
            y = -(dpr * (-panY + y * scale))
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
            ctx.lineWidth = turtle.style.width
            ctx.strokeStyle = turtle.style.stroke
            ctx.stroke()
            ctx.lineWidth = 1;
            ctx.fillStyle = turtle.style.fill
            if (turtle.style.fill !== 'none') ctx.fill()
          
          
       
        
        })
      }
      
  
    }

  }else{
    patchStore({animate:false})
    for (const turtle of turtles) {
   
      ctx.beginPath()
  
      for (const polyline of turtle.path) {
        // let paths = polyline.map(([x, y]) => [
        //   dpr * (panX + x * scale),
        //   -(dpr * (-panY + y * scale))
        // ])
  
        // paths = lineclip(paths, [0, 0, width, height])
  
        polyline.forEach((p, i) => {
          setTimeout(()=>{
            
             let [x, y] = p
             x = dpr * (panX + x * scale)
             y = -(dpr * (-panY + y * scale))
             if (i === 0) ctx.moveTo(x, y)
             else ctx.lineTo(x, y)
             ctx.lineWidth = turtle.style.width
             ctx.strokeStyle = turtle.style.stroke
             ctx.stroke()
             ctx.lineWidth = 1;
             ctx.fillStyle = turtle.style.fill
             if (turtle.style.fill !== 'none') ctx.fill()
             },j) 
            j+=animation_speed
            
          
       
        
        })
      }
      
  
    }
    
       
  }

  
  // if(animate){
  //   for(const turtle of turtles){
  //     ctx.beginPath()
      
  //   for(const polyline of turtle.path){
  //     let [x1, y1, x2, y2] = polyline
  //     x1 = dpr * (panX + x1 * scale)
  //     y1 = -(dpr * (-panY + y1 * scale))
  //     x2 = dpr * (panX + x2 * scale)
  //     y2 = -(dpr * (-panY + y2 * scale))
  //     ctx.beginPath()
  //     ctx.moveTo(x1, y1)
  //     ctx.lineTo(x2, y2)
  //     ctx.lineWidth = 1
  //     ctx.strokeStyle = 'black'
  //     ctx.stroke()
  //   }}

  // }
 
}
