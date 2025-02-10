import React, { useState, useRef, useEffect } from 'react';
import { Upload, RefreshCw, Play, Square, Pencil, Eraser } from 'lucide-react';

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [points, setPoints] = useState<{ x: number; y: number; inside: boolean }[]>([]);
  const [totalPoints, setTotalPoints] = useState(1000);
  const [ratio, setRatio] = useState(0);
  const [insideCount, setInsideCount] = useState(0);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ x: number; y: number }[]>([]);
  const [isPathClosed, setIsPathClosed] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const img = new Image();
          img.onload = () => {
            setImage(img.src);
            setPoints([]);
            setRatio(0);
            setInsideCount(0);
            setDrawPoints([]);
            setIsPathClosed(false);
            
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              }
            }
          };
          img.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isPointInside = (ctx: CanvasRenderingContext2D, x: number, y: number): boolean => {
    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return pixel[3] > 0;
    } catch (error) {
      console.error('Error checking point:', error);
      return false;
    }
  };

  const generatePoints = () => {
    if (!canvasRef.current) return;
    
    setIsCalculating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Si hay una imagen, la dibujamos primero
    if (image) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        generateRandomPoints(ctx);
      };
      img.src = image;
    } else {
      // Si no hay imagen, usamos el path dibujado
      generateRandomPoints(ctx);
    }
  };

  const generateRandomPoints = (ctx: CanvasRenderingContext2D) => {
    const newPoints = [];
    let pointsInside = 0;
    
    for (let i = 0; i < totalPoints; i++) {
      const x = Math.random() * canvasRef.current!.width;
      const y = Math.random() * canvasRef.current!.height;
      const inside = isDrawMode ? isPointInsidePath(x, y) : isPointInside(ctx, x, y);
      if (inside) pointsInside++;
      newPoints.push({ x, y, inside });
    }

    newPoints.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = point.inside ? '#22c55e' : '#ef4444';
      ctx.fill();
    });

    setPoints(newPoints);
    setInsideCount(pointsInside);
    setRatio(pointsInside / totalPoints);
    setIsCalculating(false);
  };

  const getCanvasCoordinates = (event: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event) {
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    }
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!isDrawMode || isPathClosed) return;
    
    const coords = getCanvasCoordinates(event);
    if (!coords) return;

    setDrawPoints(prev => [...prev, coords]);
    redrawCanvas();
  };

  const handleDoubleClick = () => {
    if (!isDrawMode || drawPoints.length < 3) return;
    
    setIsPathClosed(true);
    redrawCanvas(true);
  };

  const redrawCanvas = (closeShape = false) => {
    const canvas = canvasRef.current;
    if (!canvas || drawPoints.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar el canvas y redibujar la imagen si existe
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawPath(ctx, closeShape);
      };
      img.src = image;
    } else {
      drawPath(ctx, closeShape);
    }
  };

  const drawPath = (ctx: CanvasRenderingContext2D, closeShape: boolean) => {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';

    drawPoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
      
      // Dibujar punto
      ctx.fillStyle = index === 0 ? '#4CAF50' : '#2196F3';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    if (closeShape || isPathClosed) {
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fill();
    }
    ctx.stroke();
  };

  const isPointInsidePath = (x: number, y: number): boolean => {
    const canvas = canvasRef.current;
    if (!canvas || !isPathClosed || drawPoints.length < 3) return false;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    return ctx.isPointInPath(new Path2D(getPathString()), x, y);
  };

  const getPathString = (): string => {
    return drawPoints.reduce((path, point, i) => {
      return path + (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`) + 
        (i === drawPoints.length - 1 ? ' Z' : '');
    }, '');
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (image) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = image;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setDrawPoints([]);
    setIsPathClosed(false);
    setPoints([]);
    setRatio(0);
    setInsideCount(0);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Calculadora de Área Monte Carlo
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-4">1. Cargar Imagen de Superficie</h2>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition">
                  <Upload size={20} />
                  Subir Imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => {
                    setIsDrawMode(!isDrawMode);
                    if (!isDrawMode) {
                      setDrawPoints([]);
                      setIsPathClosed(false);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isDrawMode 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Pencil size={20} />
                  Dibujar
                </button>
                {isDrawMode && (
                  <button
                    onClick={clearCanvas}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    <Eraser size={20} />
                    Borrar
                  </button>
                )}
              </div>
              {isDrawMode && (
                <p className="mt-2 text-sm text-gray-600">
                  Haz clic para añadir puntos. Doble clic para cerrar la forma.
                </p>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-4">2. Generar Puntos</h2>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={totalPoints}
                  onChange={(e) => setTotalPoints(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-32 px-3 py-2 border rounded-lg"
                  min="1"
                  placeholder="Número de puntos"
                />
                <button
                  onClick={generatePoints}
                  disabled={(!image && !isPathClosed) || isCalculating}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCalculating ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <Play size={20} />
                  )}
                  Generar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="aspect-square w-full relative mb-4">
            {!image && !isDrawMode && (
              <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center text-gray-500">
                  <Square size={48} className="mx-auto mb-2" />
                  <p>Sube una imagen para comenzar o activa el modo dibujo</p>
                </div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="w-full h-full border rounded-lg"
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
            />
          </div>

          {points.length > 0 && (
            <div className="text-center space-y-2">
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-600 font-semibold">Puntos Dentro</p>
                  <p className="text-2xl font-bold text-green-700">{insideCount}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-red-600 font-semibold">Puntos Fuera</p>
                  <p className="text-2xl font-bold text-red-700">{totalPoints - insideCount}</p>
                </div>
              </div>
              <p className="text-lg font-medium text-gray-700">
                Porcentaje dentro: <span className="font-semibold text-green-600">{Math.round(ratio * 100)}%</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;