Overview:
    - This is a Sokoban based game. The fish enters a room with an 8x5 grid (8 across, 5 down) as tall as the screen lets it, with the wall filled in at the sides on which the game is played. The goal is to get to the exit in a set amount of moves by moving objects on the grid to clear the way.

Goal:
    - Solve the puzzle with minimal moves to get the most stars

UI:
    - all panels are stylized to look like stone plates, consistent with the site theme.
    - in the bottom left there is a move counter. with each move the player makes the counter should decrement the remaining moves by 1. each level starts with a set number of moves. when the counter reaches 0, flash the counter and pulse a few times before fading out. after this a panel will apear showing "Out of moves!" and a retry button below.
    - On puzzle solved, stars fly out of the chest and land in the middle of the screen. The middle has frames for 3 stars that the flying stars can land in.
    - On final puzzle solved, after showing the collected stars show a stats panel in the bottom left corner, about 40% of the screen each way, with the results from each level shown in the same 3 star format and a total row. A button in its top right corner collapses it into a small stone bottom left.

Controls:
    - The player moves along the grid vertically or horizontally, each step costs a move. 
    - The player can't move to unwalkable terrain.
    - If the player attempts to go to a space ocupied by an interactable object, they should interact with it.
    - If nothing happens after an input, no moves are used.

Game Field, Objects and Notation:
    - The game field is constructed based on a given text matrix. Each space is denoted with a character. All spaces have an Empty Space on the bottom by default, and an additional object if specified in the matrix.
    - Objects (Notation):
        - Empty Space (O) - an empty walkable space. looks like a gravel ocean floor
        - Rocky Terrain (X) - an unwalkable space covered by rocks.
        - Hermit Crab (H) - an interactable object that can be pushed one space back if it is unoccupied, the fish advances with it in one move. If it is blocked nothing happens and no move is used.
        - Clam Shell (C) - an interactable object that can be pushed one space back if it is unoccupied, the fish advances with it in one move. If the space is occupied the clam breaks, player stays in place, and that costs a move.
        - Algae (A) - a walkable space that costs 2 moves to enter, also when pushing something off it. Can't be entered with 1 move left.
        - Start (S) - en empty space where the fish starts.
        - Chest (G) - an interactable object that activates when a player tries to walk to it. The player hits it and stays in place, the chest opens showing how many of 3 stars were achieved.


Levels:
{
    Level: 1
    Moves: 15
    Stars: 3 for 13 moves used, 2 for 14, 1 for 15
    Notes: Crabs. There's no way round without pushing, and pushing the wrong one shuts the way.
    Solution: rrrulUrrrrDRD (capitals move, lower case push, ! breaks a clam)
    Matrix:
    {
        X X O O O O O O
        X O H H X X O O
        S H O O O O X G
        O O O H O O X X
        X O O O O O O O
    }
},
{
    Level: 2
    Moves: 15
    Stars: 3 for 13 moves used, 2 for 14, 1 for 15
    Notes: Clams. It can't be solved without breaking any.
    Solution: Rrrruu!Urrr!RDD (capitals move, lower case push, ! breaks a clam)
    Matrix:
    {
        O H O O O C O O
        O O X X C X X O
        S O C O O O X G
        O O O C O O O X
        O X X O O O O X
    }
},
{
    Level: 3
    Moves: 18
    Stars: 3 for 16 moves used, 2 for 17, 1 for 18
    Notes: Everything. It needs a clam broken and the best route goes through the algae.
    Solution: RuRrddd!DrrrURU (capitals move, lower case push, ! breaks a clam)
    Matrix:
    {
        O O O O O O O X
        O H O H O O O X
        S O X C O X X G
        O C X A X X O O
        O O X A C O O O
    }
}
