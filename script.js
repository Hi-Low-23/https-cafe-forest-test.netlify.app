// Matter.js module aliases
const Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Mouse = Matter.Mouse,
    MouseConstraint = Matter.MouseConstraint;

// Create engine
const engine = Engine.create();
const world = engine.world;

// Disable default gravity initially (or set very low) so things float slowly
engine.gravity.y = 0;
engine.gravity.x = 0;

// Create renderer
const render = Render.create({
    element: document.getElementById('world'),
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: '#1a1a1a', // Match body bg
        wireframes: false // Proper rendering
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// Add walls
const wallOptions = { isStatic: true, render: { visible: false } };
let walls = [];
function updateWalls() {
    Composite.remove(world, walls);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const thickness = 100;

    walls = [
        Bodies.rectangle(width / 2, -thickness / 2, width, thickness, wallOptions), // Top
        Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, wallOptions), // Bottom
        Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, wallOptions), // Right
        Bodies.rectangle(-thickness / 2, height / 2, thickness, height, wallOptions) // Left
    ];
    Composite.add(world, walls);
}
updateWalls();
window.addEventListener('resize', () => {
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    updateWalls();
});

// Create "Wooden" Menu Items
const menuItems = [
    "本日、在庫あり",
    "深煎りブレンド",
    "森のスコーン",
    "季節のタルト",
    "水出しアイス"
];

function createMenuButton(x, y, text) {
    // Canvas for texture generation (simple wood texture)
    const width = 200;
    const height = 60;

    // We will rely on render.text features if we use a plugin, but Matter.js default render doesn't support text well.
    // So we'll use a trick: `render.sprite.texture` needs an image URL.
    // Let's create a canvas, draw the button with text, convert to data URL.

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw wood background
    ctx.fillStyle = '#8D6E63'; // Base brown
    ctx.fillRect(0, 0, width, height);

    // Add grain logic (simple lines)
    ctx.strokeStyle = '#6D4C41';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, Math.random() * height);
        ctx.bezierCurveTo(width / 3, Math.random() * height, 2 * width / 3, Math.random() * height, width, Math.random() * height);
        ctx.stroke();
    }

    // Add border/bevel
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, width, height);

    // Add Text
    ctx.fillStyle = '#FFF8E1';
    ctx.font = '24px "Hiragino Mincho ProN", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    const texture = canvas.toDataURL();

    const body = Bodies.rectangle(x, y, width, height, {
        restitution: 0.6, // Bounciness
        frictionAir: 0.05, // Floatiness (higher = thicker fluid)
        render: {
            sprite: {
                texture: texture,
                xScale: 1,
                yScale: 1
            }
        }
    });

    return body;
}

// Add buttons scattered
menuItems.forEach((item, index) => {
    const x = Math.random() * (window.innerWidth - 200) + 100;
    const y = Math.random() * (window.innerHeight - 200) + 100;
    const button = createMenuButton(x, y, item);
    Composite.add(world, button);
});

// Interactivity: Mouse
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
Composite.add(world, mouseConstraint);
render.mouse = mouse; // Keep the mouse in sync with rendering

// Device Orientation
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');

startBtn.addEventListener('click', () => {
    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation);
                    overlay.classList.add('hidden');
                } else {
                    alert('ジャイロ機能の許可が必要です。');
                }
            })
            .catch(console.error);
    } else {
        // Non-iOS 13+ devices
        window.addEventListener('deviceorientation', handleOrientation);
        overlay.classList.add('hidden');
    }
});

function handleOrientation(event) {
    const { beta, gamma } = event; // beta: front-back tilt, gamma: left-right tilt

    // Map tilt to gravity
    // Default gravity is usually 1. We want gentle drifting.
    // gamma (-90 to 90) -> gravity.x
    // beta (-180 to 180) -> gravity.y

    // Clamp values to avoid extreme forces
    const x = Math.min(Math.max(gamma / 45, -1), 1);
    const y = Math.min(Math.max(beta / 45, -1), 1);

    engine.gravity.x = x * 0.5; // Scale down for "floating" feel
    engine.gravity.y = y * 0.5;
}

// Fallback: Use mouse position to influence gravity slightly (for testing on desktop)
// Center of screen is (0,0) gravity. Edges extend gravity.
document.addEventListener('mousemove', (e) => {
    // Only if not using device orientation (we can't easily detect usage, but this is fine for desktop testing)
    // If user is on mobile with touch, this might conflict, but usually separate.
    // Let's make it subtle.

    // const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    // const y = (e.clientY / window.innerHeight - 0.5) * 2;
    // engine.gravity.x = x * 0.5;
    // engine.gravity.y = y * 0.5;

    // Commented out to prioritize "pure" mouse dragging if on desktop, 
    // or uncomment for "mouse defines gravity" testing.
    // For now, let's leave it commented to let users drag buttons around.
});

// Floating loop (breathe effect if no gravity)
/*
Events.on(engine, 'beforeUpdate', function() {
    // Add some random turbulence or buoyancy if needed
});
*/
