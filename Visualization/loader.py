from turtle import bgcolor, clear
from PIL import Image, ImageDraw
import math

file = open("path", "r")
path_lines = [x.strip() for x in file.readlines()]
file.close()

# make each array item into sep array
path_lines = [item.split(" ") for item in path_lines]
labels = path_lines[0]
inits = path_lines[1]
path_lines = path_lines[2:]

data = {}
for i, label in enumerate(labels):
    data[label] = [line[i] for line in path_lines]

world_h = 15
world_w = 100
sidewalk_h = 2
parking_h = 2
road_h = world_h - parking_h - (sidewalk_h * 2)

def draw_road(img, draw):
    draw.rectangle([(0, 0), (world_w, world_h + 1)], fill="#DDD", outline=None, width=0)
    draw.rectangle([(0, sidewalk_h), (world_w, world_h - sidewalk_h)], fill="#444", outline=None, width=0)
    draw.rectangle([(0, sidewalk_h), (world_w, sidewalk_h + parking_h - 1)], fill="#888", outline=None, width=0)
    line_length = 5
    for i in range(int(img.width/line_length)):
        x_pos = i*line_length*2
        center = math.floor(road_h / 2) + sidewalk_h + parking_h
        draw.rectangle([(x_pos, center), (x_pos + line_length, center)], fill = "#FFF", outline=None, width=0)
    
def draw_crosswalk(img, draw):
    x_pos = 80
    width = 10
    draw.rectangle([(x_pos, sidewalk_h), (x_pos + width, sidewalk_h + parking_h + road_h)], fill="#444")
    for i in range(2):
        x_coord = x_pos + i*width
        draw.rectangle([(x_coord, 2), (x_coord, parking_h + sidewalk_h + road_h)], fill ="white", outline=None, width=0)

def draw_ped(img, draw, x_pos, y_pos):
    draw.rectangle([(x_pos, y_pos), (x_pos, y_pos)], fill="green", outline=None, width=0)

def draw_scene(img):
    draw = ImageDraw.Draw(img)
    draw_road(img, draw)
    draw_crosswalk(img, draw)

frames = []
frame_count = len(path_lines)
for i in range(frame_count):
    img = Image.new(size=(100, 16), mode="RGB", color="white")
    draw_scene(img)
    draw = ImageDraw.Draw(img)
    x_pos = int(data["car_x"][i])
    y_pos = int(data["car_y"][i])
    draw.rectangle([(x_pos, y_pos), (x_pos + 2, y_pos + 1)], fill="red", outline=None, width=0)

    x_pos_ped = int(data["ped_x"][i])
    y_pos_ped = int(data["ped_y"][i])
    draw_ped(img, draw, x_pos_ped, y_pos_ped)
    img = img.transpose(Image.FLIP_TOP_BOTTOM).resize((img.width * 20, img.height * 20), Image.BOX)
    frames.append(img)

frames[0].save('out.gif',
               save_all = True, append_images = frames[1:],
               optimize = False, duration = 20, loop = 0)