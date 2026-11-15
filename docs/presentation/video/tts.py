import asyncio, edge_tts, sys
LINES = [
 "Welcome to Sol by Sol, our Mars base mission trainer!",
 "Every Martian day starts with Commander Nova's briefing on the weather.",
 "Share ten power units: life support for air, the greenhouse for food, then the shield, the rover and the weather station.",
 "Run the sol. Oh no, a dust storm cuts solar power in half!",
 "Send rock samples to Earth and watch your crew. Survive all fourteen sols to win!",
 "Real NASA data, like Curiosity's radiation readings, powers every event.",
 "Play Sol by Sol now, and train like a junior astronaut!",
]
async def main():
    for i, t in enumerate(LINES):
        await edge_tts.Communicate(t, "en-US-AvaNeural", rate="+22%").save(f"voice/{i}.mp3")
asyncio.run(main())
