type Size = {
    width:number;
    height:number;
}

type Position = {
    x:number;
    y:number;
}

type Bounds = {
    size:Mp.Size;
    position:Mp.Position;
}

type Config = {
    bounds: Bounds;
    isMaximized:boolean;
}

type mode = "medium" | "expert";
