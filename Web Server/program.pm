mdp

const int street_length = 100;
const int sidewalk_height = 2;

const int crosswalk_pos = 80;
const int crosswalk_width = 10;
const int crosswalk_height = 11;

const int max_speed = 3;


const double neutral = 0.5;
const double change_prob1 = 0.7;
const double change_prob2 = 1 - change_prob1;

// block properties
const int block_height = 2;
const int block_width = 5;
const int block_x1 = 69; // crosswalk_pos - 20;
const int block_y1 = 4; // sidewalk_height;
const int block_x2 = 76; // block_x1 + block_width;
const int block_y2 = 2; // sidewalk_height + block_height;

// car properties
const int car_height = 2;
const int car_width = max_speed;

const int world_height = (sidewalk_height * 2) + crosswalk_height;

// formula is_ped_visible = ?;

// if car @ x_pos, then formula line to ped?

global turn : [0..1] init 0;

label "crash" = ((ped_x >= car_x) & (ped_x <= ped_x + car_width)) & ((ped_y >= car_y) & (ped_y <= car_y + car_height));

formula dist = max(ped_x-car_x, car_x - ped_x) + max(ped_y - car_y, car_y - ped_y);	
formula safe_dist = dist > 15;
formula is_on_sidewalk = (ped_y < sidewalk_height) | (ped_y > sidewalk_height + crosswalk_height);
formula wait_prob = (crosswalk_pos - ped_x) / 10;

module Car
	car_x : [0..street_length] init 5;
	car_v : [0..max_speed] init 0;
	car_y : [sidewalk_height..world_height-sidewalk_height] init 5;
	visibility : [0..1] init 1;

	// TO-DO: figure out why/when the car would accelerate/brake (e.g. ped in vis)
	[] (turn = 0) & safe_dist -> // Accelerate
		// change_prob/neutral/... etc. based on type of driver
		0.5: (car_v' = min(max_speed, car_v + 1))&(car_x' = min(street_length, car_x + min(max_speed, car_v + 1)))&(turn' = 1) +
		0.5: (car_v' = min(max_speed, car_v + 2))&(car_x' = min(street_length, car_x + min(max_speed, car_v + 2)))&(turn' = 1);
	[] (turn = 0)  -> // Brake
		// probability changes based on type of driver e.g. aggressive: +/- 2 then higher probability, cautious: then lower probability
		0.5: (car_v' = max(0, car_v - 1))&(car_x' = min(street_length, car_x + max(0, car_v - 1)))&(turn' = 1) +
		0.5: (car_v' = max(0, car_v - 2))&(car_x' = min(street_length, car_x + max(0, car_v - 2)))&(turn' = 1);

	[] (turn = 0) ->
		(car_x' = min(street_length, car_x + max(0, car_v)))&(turn' = 1);

	
endmodule

module Pedestrian
	ped_x : [0..street_length] init 85; // crosswalk_width / 2 = 10/2 = 5
	ped_y : [0..world_height] init 10;
	

	[] (is_on_sidewalk)&(turn = 1) -> // pedestrian choices from the sidewalk
		0.25: (ped_y' = min(ped_y + 1, world_height))&(turn' = 0) + // Up
		0.25: (ped_y' = max(ped_y - 1, 0))&(turn' = 0) + // Down
		0.25: (ped_x' = max(ped_x - 1, 0))&(turn' = 0) + // Left
		0.25: (ped_x' = min(ped_x + 1, street_length))&(turn' = 0); // Right
	[] (!is_on_sidewalk)&(turn = 1) -> // pedestrian choices from the crosswalk
		0.9: (ped_y' = min(ped_y + 1, world_height))&(turn' = 0) + // Up
		0.1: (ped_y' = max(ped_y - 1, 0))&(turn' = 0); // Down
endmodule

// visibility
// label hit *
// car strat stay same speed *
// heading for ped
// intention to wait to cross