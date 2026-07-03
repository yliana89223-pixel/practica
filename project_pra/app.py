from flask import Flask, request, jsonify, render_template
from ultralytics import YOLO
import cv2
import numpy as np
import os
import sqlite3
from datetime import datetime
import json

app = Flask(__name__)

model = YOLO('runs/detect/train/weights/best.pt')  # путь к модели(обученной)

os.makedirs('static', exist_ok=True)
os.makedirs('database', exist_ok=True)

def init_db():
    conn = sqlite3.connect('database/history.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS requests
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  filename TEXT,
                  count INTEGER,
                  details TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    """Главная страница — отдаём HTML"""
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_image():
    """Обработка загруженного изображения"""

    if 'image' not in request.files:
        return jsonify({'error': 'Файл не загружен'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Имя файла пустое'}), 400

    img_bytes = file.read()
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    
    if img is None:
        return jsonify({'error': 'Не удалось прочитать изображение'}), 400

    results = model(img)

    rendered_img = results[0].plot()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_filename = f"result_{timestamp}.jpg"
    result_path = os.path.join('static', result_filename)
    cv2.imwrite(result_path, rendered_img)

    detected_objects = results[0].boxes
    count = len(detected_objects)

    details = json.dumps({
        'class_ids': detected_objects.cls.tolist() if detected_objects else [],
        'confidences': detected_objects.conf.tolist() if detected_objects else []
    })

    conn = sqlite3.connect('database/history.db')
    c = conn.cursor()
    c.execute("INSERT INTO requests (timestamp, filename, count, details) VALUES (?, ?, ?, ?)",
              (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), file.filename, count, details))
    conn.commit()
    conn.close()

    return jsonify({
        'count': count,
        'result_url': f'/static/{result_filename}'
    })

@app.route('/history')
def history():
    """Страница с историей запросов"""
    conn = sqlite3.connect('database/history.db')
    c = conn.cursor()
    c.execute("SELECT id, timestamp, filename, count, details FROM requests ORDER BY id DESC")
    rows = c.fetchall()
    conn.close()
    return render_template('history.html', history=rows)

if __name__ == '__main__':
    print("Сервер запущен. Откройте в браузере: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)