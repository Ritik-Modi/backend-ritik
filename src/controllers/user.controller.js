import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // 1.GET THE USER DETAILS FROM FRONTEND
  // 2.VALIDATION - NOT EMPTY
  // 3.CHECK IF USER ALREADY EXISTS - USERNAME OR EMAIL
  // 4.CHECK FOR IMAGE AND AVATAR
  // 5.UPLOAD THEM TO CLOUDINARY , AVATAR
  // 6.CREATE USER OBJECT - CREATE ENTRY IN DATABASE
  // 7.REMOVE THE PASSWORD AND REFRESH TOKEN FIELD FROM RESPONSE
  // 8.CHECK FOR USER CREATION
  // 9.RETURN RESPONSE

  // 1
  const { fullName, email, username, password } = req.body;
  console.log("email: ", email);

  // 2
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "ALL FIELD ARE REQUIRED");
  }

  // 3
  const existedUser = User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    ApiError(409, "User with email or username already exists");
  }

  // 4
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverimageLocalPath = req.files?.coverimage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // 5
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverimage = await uploadOnCloudinary(coverimageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar on cloudinary");
  }

  // 6
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    username: username.lowercase(),
    password,
  });

  // 7
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 8
  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  // 9
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
