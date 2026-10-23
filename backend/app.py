from flask import Flask, jsonify
from flask_cors import CORS
from routes.auth import auth_bp
from routes.resume import resume_bp

app = Flask(__name__)
CORS(app) # Enable CORS for frontend connection

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(resume_bp, url_prefix='/api/resume')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running!"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
