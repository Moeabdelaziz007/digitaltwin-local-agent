import asyncio
import logging
from dotenv import load_dotenv
from livekit.agents import AutoSession, JobContext, WorkerOptions, cli, tts
from livekit.plugins import ollama, silero
from kokoro_onnx import Kokoro
import soundfile as sf
import io
import os

load_dotenv()

# Logger Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("twin-agent")

# --- Custom Kokoro TTS Plugin ---
class KokoroTTS(tts.TTS):
    def __init__(self, model_path="kokoro-v1.0.onnx", voices_path="voices.bin"):
        super().__init__(capabilities=tts.TTSCapabilities(streaming=False))
        self.kokoro = Kokoro(model_path, voices_path)

    def synthesize(self, text: string) -> tts.SynthesizedAudio:
        # Note: In a real implementation we would stream chunks, 
        # but Kokoro-onnx is fast enough for full-sentence synthesis in <100ms.
        samples, rate = self.kokoro.create(text, voice="af_heart", speed=1.0)
        
        # Convert to ByteStream
        buf = io.BytesIO()
        sf.write(buf, samples, rate, format='WAV')
        return tts.SynthesizedAudio(text=text, data=buf.getvalue())

# --- Main Agent Loop ---
async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    
    # 1. Initialize Ollama for local intelligence
    llm = ollama.LLM(model="gemma") 
    
    # 2. Local-First TTS (Kokoro)
    # Note: Requires model files downloaded into sidecar/python/models/
    my_tts = KokoroTTS() 

    # 3. Define the Voice Assistant Pipeline
    assistant = AutoSession(
        ctx.room,
        participant=ctx.participant,
        stt=silero.STT(), # Local STT
        llm=llm,
        tts=my_tts,
        vad=silero.VAD(), # Local Voice Activity Detection
    )

    # 4. Starting the session
    assistant.start()
    logger.info("Agent is live and listening...")

    # Optional: Greeting the user
    await assistant.say("Digital Mini Twin is online. I'm listening.")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
