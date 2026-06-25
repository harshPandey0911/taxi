import fs from 'fs';
import path from 'path';

const mappings = [
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c1937ec8-f66e-4d3b-9f27-f7b80bfe6635\\yellow_taxi_3d_1780306487227.png',
    dest: 'uploads/content-app-modules-1780295357282.webp'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c1937ec8-f66e-4d3b-9f27-f7b80bfe6635\\yellow_truck_3d_1780306506315.png',
    dest: 'uploads/content-app-modules-1780294982483.jpeg'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c1937ec8-f66e-4d3b-9f27-f7b80bfe6635\\red_car_3d_1780306523873.png',
    dest: 'uploads/content-app-modules-1780295567541.webp'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c1937ec8-f66e-4d3b-9f27-f7b80bfe6635\\blue_miniev_3d_1780306543911.png',
    dest: 'uploads/content-app-modules-1780295134914.jpeg'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c1937ec8-f66e-4d3b-9f27-f7b80bfe6635\\courier_bike_3d_1780306562490.png',
    dest: 'uploads/content-app-modules-1780295743112.jpeg'
  },
  {
    src: 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\c1937ec8-f66e-4d3b-9f27-f7b80bfe6635\\white_pickup_3d_1780306584979.png',
    dest: 'uploads/content-app-modules-1780295637531.jpeg'
  }
];

mappings.forEach(m => {
  if (fs.existsSync(m.src)) {
    fs.copyFileSync(m.src, m.dest);
    console.log(`Successfully replaced ${m.dest} with new premium icon.`);
  } else {
    console.error(`Source file not found: ${m.src}`);
  }
});
