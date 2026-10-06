FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.lock /app/backend/requirements.lock
RUN pip install --no-cache-dir -r backend/requirements.lock && useradd --create-home form
COPY backend /app/backend
COPY ai /app/ai
COPY iot /app/iot
RUN mkdir /data && chown form:form /data
USER form
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
